import { pgTable, serial, text, integer, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { trackedPages } from "./tracked_pages";

export const trackedFields = pgTable(
  "tracked_fields",
  {
    id: serial("id").primaryKey(),
    pageId: integer("page_id")
      .notNull()
      .references(() => trackedPages.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    cssSelector: text("css_selector").notNull(),
    attribute: text("attribute", { enum: ["text", "href", "src"] })
      .default("text")
      .notNull(),
    valueType: text("value_type", { enum: ["text", "number", "boolean"] })
      .default("text")
      .notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    notifyOnChange: boolean("notify_on_change").default(false).notNull(),
    alertMin: text("alert_min"),
    alertMax: text("alert_max"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("fields_page_id_idx").on(table.pageId),
  ],
);
