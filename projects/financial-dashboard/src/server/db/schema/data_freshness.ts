import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const dataFreshness = pgTable(
  "data_freshness",
  {
    id: serial("id").primaryKey(),
    symbol: text("symbol").notNull(),
    dataType: text("data_type", { enum: ["candles", "profile", "indicators"] }).notNull(),
    lastFetchedAt: timestamp("last_fetched_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("freshness_sym_type_idx").on(table.symbol, table.dataType),
  ],
);
