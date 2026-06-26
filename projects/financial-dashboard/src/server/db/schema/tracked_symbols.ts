import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const trackedSymbols = pgTable("tracked_symbols", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name"),
  type: text("type", { enum: ["stock", "etf", "fund"] }).notNull().default("stock"),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});
