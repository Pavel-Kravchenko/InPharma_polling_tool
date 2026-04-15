"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useEventSource } from "@/lib/useEventSource";
import BarChart from "../components/BarChart";
import WordCloud from "../components/WordCloud";
import RatingChart from "../components/RatingChart";

interface Question {
  id: string;
  type: "multiple_choice" | "word_cloud" | "rating_scale";
  title: string;
  options: string | null;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  presentation?: { roomCode: string };
}

interface MultipleChoiceResults {
  counts: Record<string, number>;
}

interface WordCloudResults {
  frequency: Record<string, number>;
}

interface RatingScaleResults {
  counts: Record<string, number>;
  average: number | null;
}

type Results = MultipleChoiceResults | WordCloudResults | RatingScaleResults;

function isMCResults(r: Results): r is MultipleChoiceResults {
  return "counts" in r && !("average" in r);
}

function isWordCloudResults(r: Results): r is WordCloudResults {
  return "frequency" in r;
}

function isRatingResults(r: Results): r is RatingScaleResults {
  return "counts" in r && "average" in r;
}

function totalVotes(results: Results | null, type: string): number {
  if (!results) return 0;
  if (type === "word_cloud" && isWordCloudResults(results)) {
    return Object.values(results.frequency).reduce((s, c) => s + c, 0);
  }
  if ("counts" in results) {
    return Object.values((results as MultipleChoiceResults | RatingScaleResults).counts).reduce(
      (s, c) => s + c,
      0
    );
  }
  return 0;
}

export default function EmbedPage() {
  const params = useParams();
  const questionId = params.questionId as string;

  const [question, setQuestion] = useState<Question | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  // For word cloud, track container size
  const vizRef = useRef<HTMLDivElement>(null);
  const [vizSize, setVizSize] = useState({ width: 0, height: 0 });

  // Measure container for word cloud
  useEffect(() => {
    const el = vizRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setVizSize({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [question, results]);

  // Fetch question and initial results
  useEffect(() => {
    Promise.all([
      fetch(`/api/questions/${questionId}`).then((r) => {
        if (!r.ok) throw new Error("Question not found");
        return r.json();
      }),
      fetch(`/api/questions/${questionId}/results`).then((r) => {
        if (!r.ok) throw new Error("Results not found");
        return r.json();
      }),
    ])
      .then(([q, r]: [Question, Results]) => {
        setQuestion(q);
        setResults(r);
        if (q.presentation?.roomCode) {
          const joinUrl = `${window.location.origin}/join/${q.presentation.roomCode}`;
          QRCode.toDataURL(joinUrl, { width: 200, margin: 1 }).then(setQrDataUrl);
        }
      })
      .catch(() => setError("Question not found."));
  }, [questionId]);

  const handleSSE = useCallback((data: unknown) => {
    const event = data as { type: string; results?: Results };
    if (event.type === "vote_update" && event.results) {
      setResults(event.results);
    }
  }, []);

  useEventSource(`/api/sse/question/${questionId}`, handleSSE);

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#f5f0e8" }}
      >
        <p className="text-red-500 text-center px-6">{error}</p>
      </div>
    );
  }

  if (!question || !results) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#f5f0e8" }}
      >
        <p className="text-gray-400 text-center">Loading...</p>
      </div>
    );
  }

  const options: string[] = question.options ? JSON.parse(question.options) : [];
  const scaleMin = question.scaleMin ?? 1;
  const scaleMax = question.scaleMax ?? 5;
  const total = totalVotes(results, question.type);
  const voteLabel = question.type === "word_cloud" ? "responses" : "votes";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#f5f0e8" }}
    >
      {/* Branding — top right, small and subtle */}
      <div className="absolute top-3 right-4 select-none" style={{ color: "#1a3a5c", opacity: 0.55 }}>
        <span className="text-sm font-semibold tracking-wide">
          InPharma
          <sup className="text-[10px] ml-0.5 font-normal">2026</sup>
        </span>
      </div>

      {/* Question title */}
      <div className="px-8 pt-8 pb-4 max-w-4xl w-full mx-auto">
        <h1
          className="font-bold leading-tight"
          style={{ color: "#1a3a5c", fontSize: "clamp(44px, 6vw, 64px)" }}
        >
          {question.title}
        </h1>
      </div>

      {/* Visualization area — takes remaining space */}
      <div
        ref={vizRef}
        className="flex-1 flex items-center justify-center px-4 pb-8 w-full max-w-4xl mx-auto min-h-[300px]"
      >
        {question.type === "multiple_choice" && isMCResults(results) && (
          <BarChart counts={results.counts} options={options} />
        )}

        {question.type === "word_cloud" && isWordCloudResults(results) && (
          <WordCloud
            frequency={results.frequency}
            width={vizSize.width}
            height={vizSize.height}
          />
        )}

        {question.type === "rating_scale" && isRatingResults(results) && (
          <RatingChart
            counts={results.counts}
            average={results.average}
            scaleMin={scaleMin}
            scaleMax={scaleMax}
            scaleMinLabel={question.scaleMinLabel}
            scaleMaxLabel={question.scaleMaxLabel}
          />
        )}
      </div>

      {/* QR code — bottom left */}
      {qrDataUrl && (
        <div className="absolute bottom-3 left-4">
          <img src={qrDataUrl} alt="Join" className="rounded" style={{ width: 200, height: 200, opacity: 0.85 }} />
        </div>
      )}

      {/* Total count — bottom right, small, gray */}
      <div className="absolute bottom-3 right-4 text-xs text-gray-400 select-none tabular-nums">
        {total} {voteLabel}
      </div>
    </div>
  );
}
