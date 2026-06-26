import { pgTable, serial, text, date, numeric, bigint, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const priceHistory = pgTable(
  "price_history",
  {
    id: serial("id").primaryKey(),
    symbol: text("symbol").notNull(),
    date: date("date").notNull(),
    open: numeric("open", { precision: 12, scale: 4 }),
    high: numeric("high", { precision: 12, scale: 4 }),
    low: numeric("low", { precision: 12, scale: 4 }),
    close: numeric("close", { precision: 12, scale: 4 }),
    volume: bigint("volume", { mode: "number" }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("symbol_date_idx").on(table.symbol, table.date),
  ],
);
