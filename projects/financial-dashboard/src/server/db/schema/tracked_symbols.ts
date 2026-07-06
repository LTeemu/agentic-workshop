import { pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const trackedSymbols = pgTable(
  "tracked_symbols",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    name: text("name"),
    type: text("type", { enum: ["stock", "etf", "fund"] }).notNull().default("stock"),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserSymbol: unique("tracked_symbols_user_symbol_unique").on(table.userId, table.symbol),
  }),
);
