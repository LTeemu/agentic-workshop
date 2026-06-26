"use client";

interface FinnhubQuote {
  c: number;   // current price
  d: number;   // change
  dp: number;  // percent change
  h: number;   // day high
  l: number;   // day low
  o: number;   // open
  pc: number;  // previous close
}

interface KpiCardsProps {
  quote: FinnhubQuote | null | undefined;
}

export function KpiCards({ quote }: KpiCardsProps) {
  if (!quote) return null;

  const formatPercent = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
  const colorClass = (v: number) => (v >= 0 ? "text-green-600" : "text-red-600");

  // Day range utilization — where is price within today's range (0–1)
  const dayRange = quote.h - quote.l;
  const rangePosition = dayRange > 0 ? ((quote.c - quote.l) / dayRange) : 0.5;

  // Gap from previous close to open
  const gap = quote.o - quote.pc;

  // Intraday volatility as % of price
  const intradayVol = quote.pc > 0 ? (dayRange / quote.pc) * 100 : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <KpiCard label="Price" value={`$${quote.c.toFixed(2)}`} />
      <KpiCard
        label="Change"
        value={formatPercent(quote.dp)}
        className={colorClass(quote.dp)}
      />
      <KpiCard
        label="Day Range"
        value={`$${quote.l.toFixed(2)} – $${quote.h.toFixed(2)}`}
      />
      <KpiCard
        label="Range Position"
        value={`${(rangePosition * 100).toFixed(0)}%`}
        className={
          rangePosition > 0.7
            ? "text-green-600"
            : rangePosition < 0.3
              ? "text-red-600"
              : ""
        }
      />
      <KpiCard
        label="Intraday Vol"
        value={`${intradayVol.toFixed(1)}%`}
      />
      <KpiCard
        label="Gap from Open"
        value={formatPercent(gap !== 0 ? (gap / quote.pc) * 100 : 0)}
        className={gap >= 0 ? "text-green-600" : "text-red-600"}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-lg font-semibold ${className ?? ""}`}>{value}</div>
    </div>
  );
}
