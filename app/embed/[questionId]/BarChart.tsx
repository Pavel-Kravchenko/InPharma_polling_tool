"use client";

const BAR_COLORS = ["#e8632b", "#1a3a5c", "#4a90d9", "#e85c5c", "#9b59b6", "#27ae60"];

interface BarChartProps {
  counts: Record<string, number>;
  options: string[];
}

export default function BarChart({ counts, options }: BarChartProps) {
  const maxCount = Math.max(...options.map((o) => counts[o] ?? 0), 1);

  return (
    <div className="flex items-end justify-center gap-4 w-full h-full px-4">
      {options.map((option, i) => {
        const count = counts[option] ?? 0;
        const heightPct = (count / maxCount) * 100;
        const color = BAR_COLORS[i % BAR_COLORS.length];

        return (
          <div key={option} className="flex flex-col items-center flex-1 min-w-0" style={{ maxWidth: "120px" }}>
            {/* Count above bar */}
            <span
              className="text-sm font-bold mb-1 tabular-nums"
              style={{ color: "#1a3a5c", minHeight: "1.25rem" }}
            >
              {count > 0 ? count : ""}
            </span>

            {/* Bar container — fixed height so bars grow from a baseline */}
            <div className="w-full flex items-end" style={{ height: "200px" }}>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: color,
                  transition: "height 500ms ease-out",
                  minHeight: count > 0 ? "4px" : "0px",
                }}
              />
            </div>

            {/* Baseline */}
            <div className="w-full h-px" style={{ backgroundColor: "#1a3a5c", opacity: 0.3 }} />

            {/* Option label below bar */}
            <span
              className="text-xs text-center mt-2 leading-tight line-clamp-2"
              style={{ color: "#1a3a5c", wordBreak: "break-word" }}
            >
              {option}
            </span>
          </div>
        );
      })}
    </div>
  );
}
