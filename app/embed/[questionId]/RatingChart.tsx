"use client";

// Color gradient: red (1) → orange (2) → blue (3) → purple (4) → green (5)
const RATING_COLORS: Record<number, string> = {
  1: "#e74c3c",
  2: "#e67e22",
  3: "#3498db",
  4: "#9b59b6",
  5: "#27ae60",
};

function getColor(value: number, min: number, max: number): string {
  // Map any value in [min,max] range to one of 5 colors
  const range = max - min;
  const normalized = range === 0 ? 0 : (value - min) / range; // 0..1
  const index = Math.round(normalized * 4) + 1; // 1..5
  return RATING_COLORS[index] ?? "#1a3a5c";
}

interface RatingChartProps {
  counts: Record<string, number>;
  average: number | null;
  scaleMin: number;
  scaleMax: number;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
}

export default function RatingChart({
  counts,
  average,
  scaleMin,
  scaleMax,
  scaleMinLabel,
  scaleMaxLabel,
}: RatingChartProps) {
  const values = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);
  const maxCount = Math.max(...values.map((v) => counts[String(v)] ?? 0), 1);

  return (
    <div className="flex flex-col gap-2 w-full px-4">
      {/* Scale labels */}
      {(scaleMinLabel || scaleMaxLabel) && (
        <div className="flex justify-between text-xs mb-2" style={{ color: "#1a3a5c", opacity: 0.65 }}>
          <span>{scaleMinLabel ? `${scaleMin} = ${scaleMinLabel}` : ""}</span>
          <span>{scaleMaxLabel ? `${scaleMax} = ${scaleMaxLabel}` : ""}</span>
        </div>
      )}

      {/* Horizontal bars */}
      {values.map((v) => {
        const count = counts[String(v)] ?? 0;
        const widthPct = (count / maxCount) * 100;
        const color = getColor(v, scaleMin, scaleMax);

        return (
          <div key={v} className="flex items-center gap-3">
            {/* Rating number */}
            <span
              className="font-bold text-base w-6 text-right shrink-0"
              style={{ color: "#1a3a5c" }}
            >
              {v}
            </span>

            {/* Bar track */}
            <div className="flex-1 rounded-full overflow-hidden" style={{ height: "28px", backgroundColor: "#e5e7eb" }}>
              <div
                className="h-full rounded-full flex items-center justify-end pr-2"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: color,
                  transition: "width 500ms ease-out",
                  minWidth: count > 0 ? "28px" : "0px",
                }}
              >
                {count > 0 && (
                  <span className="text-white text-xs font-bold tabular-nums">{count}</span>
                )}
              </div>
            </div>

            {/* Count outside bar when bar is empty */}
            {count === 0 && (
              <span className="text-xs text-gray-400 w-6 tabular-nums">0</span>
            )}
          </div>
        );
      })}

      {/* Average score */}
      {average !== null && (
        <div className="mt-4 text-center">
          <span className="text-4xl font-bold" style={{ color: "#e8632b" }}>
            {average.toFixed(1)}
          </span>
          <span className="text-sm ml-2" style={{ color: "#1a3a5c", opacity: 0.65 }}>
            average
          </span>
        </div>
      )}
    </div>
  );
}
