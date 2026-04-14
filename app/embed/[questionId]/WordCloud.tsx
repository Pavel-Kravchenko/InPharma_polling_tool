"use client";
import { useEffect, useRef, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const cloudLayout = require("d3-cloud") as () => CloudLayout;

const WORD_COLORS = ["#1a3a5c", "#e8632b", "#4a90d9", "#e85c5c", "#9b59b6", "#27ae60", "#e67e22"];

interface CloudWord {
  text?: string;
  size?: number;
  x?: number;
  y?: number;
  rotate?: number;
  value?: number;
}

interface CloudLayout {
  size(s: [number, number]): CloudLayout;
  words(w: CloudWord[]): CloudLayout;
  padding(p: number): CloudLayout;
  rotate(fn: () => number): CloudLayout;
  font(f: string): CloudLayout;
  fontWeight(w: string): CloudLayout;
  fontSize(fn: (d: CloudWord) => number): CloudLayout;
  on(type: string, fn: (words: CloudWord[]) => void): CloudLayout;
  start(): CloudLayout;
  stop(): CloudLayout;
}

interface LayoutWord {
  text: string;
  size: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
}

interface WordCloudProps {
  frequency: Record<string, number>;
  width: number;
  height: number;
}

export default function WordCloud({ frequency, width, height }: WordCloudProps) {
  const [layoutWords, setLayoutWords] = useState<LayoutWord[]>([]);
  const layoutRef = useRef<CloudLayout | null>(null);

  useEffect(() => {
    if (width === 0 || height === 0) return;

    const entries = Object.entries(frequency);
    if (entries.length === 0) {
      setLayoutWords([]);
      return;
    }

    const maxCount = Math.max(...entries.map(([, v]) => v));
    const minFontSize = 14;
    const maxFontSize = Math.min(width, height) * 0.18;

    const words: CloudWord[] = entries.map(([text, value]) => ({ text, value }));

    if (layoutRef.current) {
      layoutRef.current.stop();
    }

    const layout = cloudLayout()
      .size([width, height])
      .words(words)
      .padding(6)
      .rotate(() => (Math.random() > 0.6 ? 90 : 0))
      .font("sans-serif")
      .fontWeight("bold")
      .fontSize((d: CloudWord) => {
        const ratio = maxCount > 1 ? (d.value ?? 1) / maxCount : 1;
        return minFontSize + ratio * (maxFontSize - minFontSize);
      })
      .on("end", (placed: CloudWord[]) => {
        setLayoutWords(
          placed.map((w, i) => ({
            text: w.text ?? "",
            size: w.size ?? minFontSize,
            x: w.x ?? 0,
            y: w.y ?? 0,
            rotate: w.rotate ?? 0,
            color: WORD_COLORS[i % WORD_COLORS.length],
          }))
        );
      });

    layoutRef.current = layout;
    layout.start();

    return () => {
      layout.stop();
    };
  }, [frequency, width, height]);

  if (layoutWords.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-lg"
        style={{ width, height: Math.max(height, 200) }}
      >
        No responses yet
      </div>
    );
  }

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${width / 2},${height / 2})`}>
        {layoutWords.map((w) => (
          <text
            key={w.text}
            style={{
              fontSize: `${w.size}px`,
              fontFamily: "sans-serif",
              fontWeight: "bold",
              fill: w.color,
              transition: "all 500ms ease-out",
            }}
            textAnchor="middle"
            transform={`translate(${w.x},${w.y}) rotate(${w.rotate})`}
          >
            {w.text}
          </text>
        ))}
      </g>
    </svg>
  );
}
