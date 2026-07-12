import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { trackedFields } from "./tracked_fields";

export const fieldHistory = pgTable(
  "field_history",
  {
    id: serial("id").primaryKey(),
    fieldId: integer("field_id")
      .notNull()
      .references(() => trackedFields.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("history_field_id_scraped_at_unique_idx").on(table.fieldId, table.scrapedAt),
  ],
);
