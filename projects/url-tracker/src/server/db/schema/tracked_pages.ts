import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { folders } from "./folders";

export const trackedPages = pgTable(
  "tracked_pages",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    folderId: integer("folder_id").references(() => folders.id, { onDelete: "set null" }),
    url: text("url").notNull(),
    name: text("name"),
    imageUrl: text("image_url"),
    scrapeInterval: text("scrape_interval", { enum: ["manual", "hourly", "daily"] })
      .default("manual")
      .notNull(),
    lastScrapedAt: timestamp("last_scraped_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("pages_user_id_idx").on(table.userId),
    index("pages_folder_id_idx").on(table.folderId),
  ],
);
