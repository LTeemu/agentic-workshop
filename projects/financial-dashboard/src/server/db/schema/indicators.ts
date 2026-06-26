import { pgTable, serial, text, date, numeric, uniqueIndex } from "drizzle-orm/pg-core";

export const indicators = pgTable(
  "indicators",
  {
    id: serial("id").primaryKey(),
    symbol: text("symbol").notNull(),
    date: date("date").notNull(),
    sma20: numeric("sma_20", { precision: 12, scale: 4 }),
    sma50: numeric("sma_50", { precision: 12, scale: 4 }),
    rsi: numeric("rsi", { precision: 8, scale: 2 }),
    macd: numeric("macd", { precision: 12, scale: 4 }),
    macdSignal: numeric("macd_signal", { precision: 12, scale: 4 }),
    macdHistogram: numeric("macd_histogram", { precision: 12, scale: 4 }),
    bbUpper: numeric("bb_upper", { precision: 12, scale: 4 }),
    bbMid: numeric("bb_mid", { precision: 12, scale: 4 }),
    bbLower: numeric("bb_lower", { precision: 12, scale: 4 }),
    volatility: numeric("volatility", { precision: 8, scale: 4 }),
    volumeSma: numeric("volume_sma", { precision: 12, scale: 2 }),
  },
  (table) => [
    uniqueIndex("indicator_sym_date_idx").on(table.symbol, table.date),
  ],
);
