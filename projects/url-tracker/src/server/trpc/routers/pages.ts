import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "@/trpc/init";
import type { Db } from "@/server/db";
import { previewUrl, scrapeUrl, RobotsBlockedError } from "@/lib/scraper/scraper";
import { folders, trackedPages, trackedFields, fieldHistory } from "@/server/db/schema/index";
import { and, eq, desc, count, sql, isNull, inArray } from "drizzle-orm";

// --- Schemas ---

const fieldInputSchema = z.object({
  label: z.string().min(1).max(100),
  cssSelector: z.string().min(1).max(500),
  attribute: z.enum(["text", "href", "src"]).default("text"),
  valueType: z.enum(["text", "number", "boolean"]).default("text"),
});

const folderIdSchema = z.number().positive().nullable().optional();

// --- Shared helpers ---

interface ScrapeFieldDef {
  id: number;
  label: string;
  cssSelector: string;
  attribute: string;
  valueType: string;
  sortOrder: number;
}

interface ScrapeResult {
  title: string;
  image: string | null;
  values: Array<{ fieldId: number; label: string; value: string; error?: string }>;
}

/**
 * Run the scraper for a page and persist results.
 * Shared by scrapePage and scrapeAllPages to avoid duplication.
 */
async function doScrape(
  db: Db,
  page: { id: number; url: string; lastScrapedAt: Date | null; name: string | null; imageUrl: string | null },
  fields: ScrapeFieldDef[],
): Promise<ScrapeResult> {
  if (fields.length === 0) {
    return { title: "", image: null, values: [] };
  }

  let result;
  try {
    result = await scrapeUrl(
      page.url,
      fields.map((f) => ({
        cssSelector: f.cssSelector,
        attribute: f.attribute as "text" | "href" | "src",
        valueType: f.valueType as "text" | "number" | "boolean",
      })),
      {
        minIntervalMs: 10_000,
        lastFetchedAt: page.lastScrapedAt,
      },
    );
  } catch (err) {
    if (err instanceof RobotsBlockedError) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Blocked by ${err.hostname}/robots.txt`,
      });
    }
    throw err;
  }

  const now = new Date();
  const historyValues: Array<{ fieldId: number; value: string; scrapedAt: Date }> = [];

  for (let i = 0; i < fields.length; i++) {
    const value = result.values[i];
    if (value && !value.error) {
      historyValues.push({ fieldId: fields[i].id, value: value.value, scrapedAt: now });
    }
  }

  // Batched insert
  if (historyValues.length > 0) {
    await db.insert(fieldHistory).values(historyValues);
  }

  // Update page metadata
  await db
    .update(trackedPages)
    .set({
      lastScrapedAt: now,
      name: result.title || page.name,
      imageUrl: result.image || page.imageUrl,
    })
    .where(eq(trackedPages.id, page.id));

  return {
    title: result.title,
    image: result.image,
    values: result.values.map((v, i) => ({
      fieldId: fields[i].id,
      label: fields[i].label,
      value: v.value,
      error: v.error,
    })),
  };
}

// --- Router ---

export const pagesRouter = router({
  // ── Folder operations ──

  getFolders: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) return [];

    const result = await ctx.db
      .select({
        id: folders.id,
        name: folders.name,
        icon: folders.icon,
        sortOrder: folders.sortOrder,
        pageCount: count(trackedPages.id),
      })
      .from(folders)
      .leftJoin(trackedPages, eq(trackedPages.folderId, folders.id))
      .where(eq(folders.userId, ctx.userId))
      .groupBy(folders.id)
      .orderBy(folders.sortOrder);

    return result;
  }),

  createFolder: publicProcedure
    .input(z.object({ name: z.string().min(1).max(50), icon: z.string().max(10).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [folder] = await ctx.db
        .insert(folders)
        .values({ userId: ctx.userId, name: input.name, icon: input.icon ?? "📁" })
        .returning();

      return folder;
    }),

  renameFolder: publicProcedure
    .input(z.object({ id: z.number().positive(), name: z.string().min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [folder] = await ctx.db
        .update(folders)
        .set({ name: input.name })
        .where(and(eq(folders.id, input.id), eq(folders.userId, ctx.userId)))
        .returning();

      if (!folder) throw new TRPCError({ code: "NOT_FOUND" });
      return folder;
    }),

  deleteFolder: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Unassign pages first, then delete folder
      await ctx.db
        .update(trackedPages)
        .set({ folderId: null })
        .where(eq(trackedPages.folderId, input.id));

      const [deleted] = await ctx.db
        .delete(folders)
        .where(and(eq(folders.id, input.id), eq(folders.userId, ctx.userId)))
        .returning();

      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  movePage: publicProcedure
    .input(z.object({ pageId: z.number().positive(), folderId: z.number().positive().nullable() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [page] = await ctx.db
        .update(trackedPages)
        .set({ folderId: input.folderId })
        .where(and(eq(trackedPages.id, input.pageId), eq(trackedPages.userId, ctx.userId)))
        .returning();

      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      return page;
    }),

  // ── Page operations ──

  previewUrl: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ input }) => {
      return previewUrl(input.url);
    }),

  addPage: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
        name: z.string().max(500).optional(),
        folderId: z.number().positive().nullable().optional(),
        fields: z.array(fieldInputSchema).min(1).max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [page] = await ctx.db
        .insert(trackedPages)
        .values({
          userId: ctx.userId,
          url: input.url,
          name: input.name ?? null,
          folderId: input.folderId ?? null,
        })
        .returning();

      if (input.fields.length > 0) {
        await ctx.db.insert(trackedFields).values(
          input.fields.map((field, i) => ({
            pageId: page.id,
            label: field.label,
            cssSelector: field.cssSelector,
            attribute: field.attribute,
            valueType: field.valueType,
            sortOrder: i,
          })),
        );
      }

      return page;
    }),

  scrapePage: publicProcedure
    .input(z.object({ pageId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [page] = await ctx.db
        .select()
        .from(trackedPages)
        .where(and(eq(trackedPages.id, input.pageId), eq(trackedPages.userId, ctx.userId)))
        .limit(1);

      if (!page) throw new TRPCError({ code: "NOT_FOUND" });

      const fields = await ctx.db
        .select()
        .from(trackedFields)
        .where(eq(trackedFields.pageId, page.id))
        .orderBy(trackedFields.sortOrder);

      if (fields.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No fields defined for this page.",
        });
      }

      const result = await doScrape(ctx.db, page, fields);
      return { ...result, scrapedAt: new Date() };
    }),

  getPages: publicProcedure
    .input(z.object({ folderId: folderIdSchema }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) return [];

      const conditions: ReturnType<typeof eq>[] = [eq(trackedPages.userId, ctx.userId)];
      if (input?.folderId !== undefined) {
        if (input.folderId === null) {
          conditions.push(isNull(trackedPages.folderId));
        } else {
          conditions.push(eq(trackedPages.folderId, input.folderId));
        }
      }

      const pages = await ctx.db
        .select()
        .from(trackedPages)
        .where(and(...conditions))
        .orderBy(desc(trackedPages.createdAt));

      if (pages.length === 0) return [];

      // Get all field definitions for these pages
      const pageIds = pages.map((p) => p.id);
      const allFields = await ctx.db
        .select()
        .from(trackedFields)
        .where(inArray(trackedFields.pageId, pageIds))
        .orderBy(trackedFields.sortOrder);

      // Group fields by pageId
      const fieldsByPage = new Map<number, typeof allFields>();
      for (const field of allFields) {
        const list = fieldsByPage.get(field.pageId) ?? [];
        list.push(field);
        fieldsByPage.set(field.pageId, list);
      }

      // Get latest value for every field
      const fieldIds = allFields.map((f) => f.id);
      const valueByFieldId = new Map<number, { value: string; scrapedAt: Date }>();

      if (fieldIds.length > 0) {
        // Get latest snapshot per field using a subquery
        const latestIds = ctx.db
          .select({
            maxId: sql<number>`MAX(${fieldHistory.id})`.as("max_id"),
          })
          .from(fieldHistory)
          .where(inArray(fieldHistory.fieldId, fieldIds))
          .groupBy(fieldHistory.fieldId)
          .as("latest");

        const latestValues = await ctx.db
          .select({
            fieldId: fieldHistory.fieldId,
            value: fieldHistory.value,
            scrapedAt: fieldHistory.scrapedAt,
          })
          .from(fieldHistory)
          .innerJoin(latestIds, eq(fieldHistory.id, latestIds.maxId));

        for (const row of latestValues) {
          valueByFieldId.set(row.fieldId, { value: row.value, scrapedAt: row.scrapedAt });
        }
      }

      // Assemble result
      return pages.map((page) => {
        const fields = (fieldsByPage.get(page.id) ?? []).map((f) => ({
          id: f.id,
          label: f.label,
          cssSelector: f.cssSelector,
          attribute: f.attribute,
          valueType: f.valueType,
          latestValue: valueByFieldId.get(f.id)?.value ?? null,
          latestScrapedAt: valueByFieldId.get(f.id)?.scrapedAt ?? null,
        }));

        return { ...page, fields };
      });
    }),

  getPageDetail: publicProcedure
    .input(z.object({ pageId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [page] = await ctx.db
        .select()
        .from(trackedPages)
        .where(and(eq(trackedPages.id, input.pageId), eq(trackedPages.userId, ctx.userId)))
        .limit(1);

      if (!page) throw new TRPCError({ code: "NOT_FOUND" });

      const fields = await ctx.db
        .select()
        .from(trackedFields)
        .where(eq(trackedFields.pageId, page.id))
        .orderBy(trackedFields.sortOrder);

      return { ...page, fields };
    }),

  getFieldHistory: publicProcedure
    .input(z.object({ fieldId: z.number().positive(), limit: z.number().min(1).max(500).default(100) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) return [];

      // Verify the field belongs to a page owned by this user
      const [field] = await ctx.db
        .select({ id: trackedFields.id })
        .from(trackedFields)
        .innerJoin(trackedPages, eq(trackedFields.pageId, trackedPages.id))
        .where(
          and(
            eq(trackedFields.id, input.fieldId),
            eq(trackedPages.userId, ctx.userId),
          ),
        )
        .limit(1);

      if (!field) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db
        .select()
        .from(fieldHistory)
        .where(eq(fieldHistory.fieldId, input.fieldId))
        .orderBy(desc(fieldHistory.scrapedAt))
        .limit(input.limit);
    }),

  removePage: publicProcedure
    .input(z.object({ pageId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [deleted] = await ctx.db
        .delete(trackedPages)
        .where(and(eq(trackedPages.id, input.pageId), eq(trackedPages.userId, ctx.userId)))
        .returning();

      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  scrapeAllPages: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.userId) return [];

    const pages = await ctx.db
      .select()
      .from(trackedPages)
      .where(eq(trackedPages.userId, ctx.userId));

    const results: Array<{ pageId: number; status: string }> = [];

    // Pre-fetch all field definitions in a single query and group by pageId
    const allFields = await ctx.db
      .select()
      .from(trackedFields);

    const fieldsByPageId = new Map<number, typeof allFields>();
    for (const f of allFields) {
      const list = fieldsByPageId.get(f.pageId) ?? [];
      list.push(f);
      fieldsByPageId.set(f.pageId, list);
    }

    for (const page of pages) {
      try {
        const fields = (fieldsByPageId.get(page.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);

        if (fields.length === 0) {
          results.push({ pageId: page.id, status: "skipped: no fields" });
          continue;
        }

        await doScrape(ctx.db, page, fields);
        results.push({ pageId: page.id, status: "ok" });
      } catch (err) {
        const msg = err instanceof TRPCError && err.code === "FORBIDDEN"
          ? "blocked by robots.txt"
          : `error: ${err instanceof Error ? err.message : "unknown"}`;
        results.push({ pageId: page.id, status: msg });
      }
    }

    return results;
  }),

  // ── Field management ──

  updateField: publicProcedure
    .input(
      z.object({
        fieldId: z.number().positive(),
        label: z.string().min(1).max(100).optional(),
        cssSelector: z.string().min(1).max(500).optional(),
        attribute: z.enum(["text", "href", "src"]).optional(),
        valueType: z.enum(["text", "number", "boolean"]).optional(),
        notifyOnChange: z.boolean().optional(),
        alertMin: z.string().nullable().optional(),
        alertMax: z.string().nullable().optional(),
        sortOrder: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Verify the field belongs to the user (via page)
      const [field] = await ctx.db
        .select({ id: trackedFields.id })
        .from(trackedFields)
        .innerJoin(trackedPages, eq(trackedFields.pageId, trackedPages.id))
        .where(and(eq(trackedFields.id, input.fieldId), eq(trackedPages.userId, ctx.userId)))
        .limit(1);

      if (!field) throw new TRPCError({ code: "NOT_FOUND" });

      const updates: Record<string, unknown> = {};
      if (input.label !== undefined) updates.label = input.label;
      if (input.cssSelector !== undefined) updates.cssSelector = input.cssSelector;
      if (input.attribute !== undefined) updates.attribute = input.attribute;
      if (input.valueType !== undefined) updates.valueType = input.valueType;
      if (input.notifyOnChange !== undefined) updates.notifyOnChange = input.notifyOnChange;
      if (input.alertMin !== undefined) updates.alertMin = input.alertMin;
      if (input.alertMax !== undefined) updates.alertMax = input.alertMax;
      if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

      if (Object.keys(updates).length === 0) return { success: true };

      await ctx.db.update(trackedFields).set(updates).where(eq(trackedFields.id, input.fieldId));
      return { success: true };
    }),

  addField: publicProcedure
    .input(
      z.object({
        pageId: z.number().positive(),
        label: z.string().min(1).max(100),
        cssSelector: z.string().min(1).max(500),
        attribute: z.enum(["text", "href", "src"]).default("text"),
        valueType: z.enum(["text", "number", "boolean"]).default("text"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Verify page ownership
      const [page] = await ctx.db
        .select({ id: trackedPages.id })
        .from(trackedPages)
        .where(and(eq(trackedPages.id, input.pageId), eq(trackedPages.userId, ctx.userId)))
        .limit(1);

      if (!page) throw new TRPCError({ code: "NOT_FOUND" });

      // Get next sort order
      const [maxOrder] = await ctx.db
        .select({ max: sql<number>`COALESCE(MAX(${trackedFields.sortOrder}), -1)` })
        .from(trackedFields)
        .where(eq(trackedFields.pageId, input.pageId));

      const [field] = await ctx.db
        .insert(trackedFields)
        .values({
          pageId: input.pageId,
          label: input.label,
          cssSelector: input.cssSelector,
          attribute: input.attribute,
          valueType: input.valueType,
          sortOrder: (maxOrder?.max ?? -1) + 1,
        })
        .returning();

      return field;
    }),

  deleteField: publicProcedure
    .input(z.object({ fieldId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [field] = await ctx.db
        .select({ id: trackedFields.id })
        .from(trackedFields)
        .innerJoin(trackedPages, eq(trackedFields.pageId, trackedPages.id))
        .where(and(eq(trackedFields.id, input.fieldId), eq(trackedPages.userId, ctx.userId)))
        .limit(1);

      if (!field) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.delete(trackedFields).where(eq(trackedFields.id, input.fieldId));
      return { success: true };
    }),

  reorderFields: publicProcedure
    .input(z.object({ fields: z.array(z.object({ id: z.number().positive(), sortOrder: z.number().min(0) })) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      for (const f of input.fields) {
        // Verify ownership for each field
        const [field] = await ctx.db
          .select({ id: trackedFields.id })
          .from(trackedFields)
          .innerJoin(trackedPages, eq(trackedFields.pageId, trackedPages.id))
          .where(and(eq(trackedFields.id, f.id), eq(trackedPages.userId, ctx.userId)))
          .limit(1);

        if (field) {
          await ctx.db.update(trackedFields).set({ sortOrder: f.sortOrder }).where(eq(trackedFields.id, f.id));
        }
      }

      return { success: true };
    }),

  // ── Page settings ──

  updatePage: publicProcedure
    .input(
      z.object({
        pageId: z.number().positive(),
        name: z.string().max(500).optional(),
        scrapeInterval: z.enum(["manual", "hourly", "daily"]).optional(),
        folderId: z.number().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.scrapeInterval !== undefined) updates.scrapeInterval = input.scrapeInterval;
      if (input.folderId !== undefined) updates.folderId = input.folderId;

      if (Object.keys(updates).length === 0) return { success: true };

      const [page] = await ctx.db
        .update(trackedPages)
        .set(updates)
        .where(and(eq(trackedPages.id, input.pageId), eq(trackedPages.userId, ctx.userId)))
        .returning();

      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      return page;
    }),

  // ── Cron / scheduled scraping ──

  scrapeScheduledPages: publicProcedure.mutation(async ({ ctx }) => {
    // No auth check — this is called by cron (auth will be null)
    // It scrapes all pages whose scrapeInterval is not "manual" and whose
    // lastScrapedAt is older than the interval.

    const now = new Date();

    const pages = await ctx.db
      .select()
      .from(trackedPages)
      .where(sql`${trackedPages.scrapeInterval} != 'manual'`);

    const results: Array<{ pageId: number; status: string }> = [];
    const fieldsByPage = new Map<number, typeof allFields>();
    const allFields = await ctx.db.select().from(trackedFields);
    for (const f of allFields) {
      const list = fieldsByPage.get(f.pageId) ?? [];
      list.push(f);
      fieldsByPage.set(f.pageId, list);
    }

    for (const page of pages) {
      // Check if page is due
      if (page.lastScrapedAt) {
        const elapsed = now.getTime() - page.lastScrapedAt.getTime();
        const intervalMs = page.scrapeInterval === "hourly" ? 3_600_000
          : page.scrapeInterval === "daily" ? 86_400_000
          : 0;
        if (elapsed < intervalMs) {
          results.push({ pageId: page.id, status: "skipped: not due yet" });
          continue;
        }
      }

      try {
        const fields = (fieldsByPage.get(page.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
        if (fields.length === 0) {
          results.push({ pageId: page.id, status: "skipped: no fields" });
          continue;
        }

        await doScrape(ctx.db, page, fields);
        results.push({ pageId: page.id, status: "ok" });
      } catch (err) {
        const msg = err instanceof TRPCError && err.code === "FORBIDDEN"
          ? "blocked by robots.txt"
          : `error: ${err instanceof Error ? err.message : "unknown"}`;
        results.push({ pageId: page.id, status: msg });
      }
    }

    return results;
  }),
});
