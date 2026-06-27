"use client";

interface ProjectionData {
  currentPrice: number;
  projectedPrice: number;
  dayHigh: number;
  dayLow: number;
  signal: string;
  confidence: number;
  rangeUsed: number;
  estimatedDays: number;
}

interface ProjectionPanelProps {
  projection: ProjectionData | null | undefined;
}

export function ProjectionPanel({ projection }: ProjectionPanelProps) {
  if (!projection) {
    return (
      <section className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">Intraday Projection</h3>
        <p className="text-sm text-zinc-500">Waiting for quote data...</p>
      </section>
    );
  }

  const color =
    projection.signal === "bullish"
      ? "text-green-600"
      : projection.signal === "bearish"
        ? "text-red-600"
        : "text-zinc-500";

  const signalLabel =
    projection.signal === "bullish"
      ? "Bullish"
      : projection.signal === "bearish"
        ? "Bearish"
        : "Neutral";

  const move = projection.projectedPrice - projection.currentPrice;
  const movePercent = (move / projection.currentPrice) * 100;

  return (
    <section className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">Intraday Projection</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 text-sm">
        <div>
          <div className="text-zinc-500">Signal</div>
          <div className={`font-medium ${color}`}>{signalLabel}</div>
        </div>

        <div>
          <div className="text-zinc-500">Confidence</div>
          <div className="font-medium">{projection.confidence}%</div>
        </div>

        <div>
          <div className="text-zinc-500">Current</div>
          <div className="font-medium">${projection.currentPrice.toFixed(2)}</div>
        </div>

        <div>
          <div className="text-zinc-500">Projected</div>
          <div className={`font-medium ${color}`}>
            ${projection.projectedPrice.toFixed(2)}
            <span className="ml-1 text-xs text-zinc-400">
              ({movePercent >= 0 ? "+" : ""}{movePercent.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div>
          <div className="text-zinc-500">Day Range Used</div>
          <div className="font-medium">{projection.rangeUsed}%</div>
        </div>

        <div>
          <div className="text-zinc-500">Est. Target In</div>
          <div className="font-medium">~{projection.estimatedDays} day{projection.estimatedDays > 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Visual range bar */}
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[10px] text-zinc-400">
          <span>${projection.dayLow.toFixed(2)}</span>
          <span>${projection.dayHigh.toFixed(2)}</span>
        </div>
        <div className="relative h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="absolute h-full rounded-full bg-blue-500"
            style={{ width: `${projection.rangeUsed}%` }}
          />
          {/* Current price marker */}
          <div
            className="absolute top-0 h-4 w-0.5 -translate-y-1/4 bg-zinc-900 dark:bg-zinc-100"
            style={{ left: `${projection.rangeUsed}%` }}
          />
          {/* Projected target marker */}
          <div
            className={`absolute top-0 h-4 w-0.5 -translate-y-1/4 ${color}`}
            style={{
              left: `${Math.min(
                projection.signal === "bullish"
                  ? 100
                  : projection.signal === "bearish"
                    ? 0
                    : 50,
                100,
              )}%`,
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </section>
  );
}
