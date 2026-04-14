"use client";

const BAR_COLORS = ["#e8632b", "#1a3a5c", "#4a90d9", "#e85c5c", "#9b59b6", "#27ae60"];

interface BarChartProps {
  counts: Record<string, number>;
  options: string[];
}

export default function BarChart({ counts, options }: BarChartProps) {
  const maxCount = Math.max(...options.map((o) => counts[o] ?? 0), 1);

  return (
    <div className="flex flex-col items-center w-full px-6">
      {/* Bars row */}
      <div className="flex items-end justify-center gap-6 w-full" style={{ height: "clamp(250px, 50vh, 500px)" }}>
        {options.map((option, i) => {
          const count = counts[option] ?? 0;
          const heightPct = (count / maxCount) * 100;
          const color = BAR_COLORS[i % BAR_COLORS.length];

          return (
            <div key={option} className="flex flex-col items-center justify-end flex-1 min-w-0 h-full" style={{ maxWidth: "180px" }}>
              {/* Count above bar */}
              <span
                className="font-bold mb-2 tabular-nums"
                style={{ color: "#1a3a5c", fontSize: "clamp(20px, 2.5vw, 32px)" }}
              >
                {count > 0 ? count : ""}
              </span>

              {/* Bar */}
              <div
                className="w-full rounded-t-lg"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: color,
                  transition: "height 500ms ease-out",
                  minHeight: count > 0 ? "8px" : "0px",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Shared baseline */}
      <div className="w-full" style={{ height: "2px", backgroundColor: "#1a3a5c", opacity: 0.25 }} />

      {/* Labels row */}
      <div className="flex justify-center gap-6 w-full mt-3">
        {options.map((option) => (
          <div key={option} className="flex-1 min-w-0" style={{ maxWidth: "180px" }}>
            <span
              className="block text-center leading-snug font-medium"
              style={{ color: "#1a3a5c", fontSize: "clamp(14px, 1.5vw, 20px)", wordBreak: "break-word" }}
            >
              {option}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
