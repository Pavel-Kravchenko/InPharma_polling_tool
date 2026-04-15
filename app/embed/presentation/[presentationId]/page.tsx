"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useEventSource } from "@/lib/useEventSource";
import BarChart from "../../components/BarChart";
import WordCloud from "../../components/WordCloud";
import RatingChart from "../../components/RatingChart";

interface Question {
  id: string;
  type: "multiple_choice" | "word_cloud" | "rating_scale";
  title: string;
  options: string | null;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  order: number;
  isActive: boolean;
}

interface Presentation {
  id: string;
  title: string;
  roomCode: string;
  questions: Question[];
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

const ADMIN_STORAGE_KEY = "inpharma-admin-password";

export default function PresentationEmbedPage() {
  const params = useParams();
  const presentationId = params.presentationId as string;

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Next button state
  const [advancing, setAdvancing] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Word cloud sizing
  const vizRef = useRef<HTMLDivElement>(null);
  const [vizSize, setVizSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = vizRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setVizSize({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeQuestion, results]);

  // Fetch presentation on mount
  useEffect(() => {
    fetch(`/api/presentations/${presentationId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: Presentation) => {
        setPresentation(data);
        const active = data.questions.find((q) => q.isActive) ?? null;
        setActiveQuestion(active);
      })
      .catch(() => setError("Presentation not found."));
  }, [presentationId]);

  // Generate QR code
  useEffect(() => {
    if (!presentation) return;
    const joinUrl = `${window.location.origin}/join/${presentation.roomCode}`;
    QRCode.toDataURL(joinUrl, { width: 120, margin: 1 }).then(setQrDataUrl);
  }, [presentation]);

  // Fetch results when active question changes
  useEffect(() => {
    if (!activeQuestion) {
      setResults(null);
      return;
    }
    fetch(`/api/questions/${activeQuestion.id}/results`)
      .then((r) => r.json())
      .then((r: Results) => setResults(r))
      .catch(() => setResults(null));
  }, [activeQuestion?.id]);

  // SSE: presentation channel — listen for question changes
  const handlePresentationSSE = useCallback(
    (data: unknown) => {
      const event = data as { type: string; question?: Question; questionId?: string };
      if (event.type === "question_changed") {
        setActiveQuestion(event.question ?? null);
        // Update the questions list in presentation to reflect new active state
        if (presentation && event.questionId) {
          setPresentation((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              questions: prev.questions.map((q) => ({
                ...q,
                isActive: q.id === event.questionId,
              })),
            };
          });
        }
      }
    },
    [presentation]
  );

  useEventSource(`/api/sse/presentation/${presentationId}`, handlePresentationSSE);

  // SSE: active question channel — listen for vote updates
  const questionSseUrl = activeQuestion ? `/api/sse/question/${activeQuestion.id}` : null;

  const handleQuestionSSE = useCallback((data: unknown) => {
    const event = data as { type: string; results?: Results };
    if (event.type === "vote_update" && event.results) {
      setResults(event.results);
    }
  }, []);

  useEventSource(questionSseUrl, handleQuestionSSE);

  // Next Question logic
  function getNextQuestion(): Question | null {
    if (!presentation || !activeQuestion) return null;
    const currentIdx = presentation.questions.findIndex((q) => q.id === activeQuestion.id);
    if (currentIdx === -1 || currentIdx >= presentation.questions.length - 1) return null;
    return presentation.questions[currentIdx + 1];
  }

  async function activateQuestion(questionId: string, password: string | null) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (password) headers["x-admin-password"] = password;

    const res = await fetch(`/api/presentations/${presentationId}/activate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ questionId }),
    });

    return res;
  }

  async function handleNextQuestion() {
    const next = getNextQuestion();
    if (!next) return;

    setAdvancing(true);
    const storedPassword = typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_STORAGE_KEY) : null;

    const res = await activateQuestion(next.id, storedPassword);

    if (res.status === 401) {
      setAdvancing(false);
      setShowPasswordPrompt(true);
      return;
    }

    setAdvancing(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setAdvancing(true);

    const next = getNextQuestion();
    if (!next) { setAdvancing(false); return; }

    const res = await activateQuestion(next.id, passwordInput);

    if (res.status === 401) {
      setPasswordError("Wrong password");
      setAdvancing(false);
      return;
    }

    // Store password for future use
    sessionStorage.setItem(ADMIN_STORAGE_KEY, passwordInput);
    setShowPasswordPrompt(false);
    setPasswordInput("");
    setAdvancing(false);
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f0e8" }}>
        <p className="text-red-500 text-center px-6">{error}</p>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f0e8" }}>
        <p className="text-gray-400 text-center">Loading...</p>
      </div>
    );
  }

  const nextQuestion = getNextQuestion();
  const options: string[] = activeQuestion?.options ? JSON.parse(activeQuestion.options) : [];
  const scaleMin = activeQuestion?.scaleMin ?? 1;
  const scaleMax = activeQuestion?.scaleMax ?? 5;
  const total = activeQuestion && results ? totalVotes(results, activeQuestion.type) : 0;
  const voteLabel = activeQuestion?.type === "word_cloud" ? "responses" : "votes";

  // Waiting state
  if (!activeQuestion) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: "#f5f0e8" }}>
        <div className="absolute top-3 right-4 select-none" style={{ color: "#1a3a5c", opacity: 0.55 }}>
          <span className="text-sm font-semibold tracking-wide">
            InPharma<sup className="text-[10px] ml-0.5 font-normal">2026</sup>
          </span>
        </div>

        <p className="text-gray-400 text-2xl">Waiting for presenter to activate a question...</p>

        {qrDataUrl && (
          <div className="absolute bottom-3 left-4">
            <img src={qrDataUrl} alt="Join" className="rounded" style={{ width: 80, height: 80, opacity: 0.85 }} />
          </div>
        )}

        {/* Next button to start first question */}
        {presentation.questions.length > 0 && (
          <button
            onClick={async () => {
              const first = presentation.questions[0];
              setAdvancing(true);
              const storedPassword = sessionStorage.getItem(ADMIN_STORAGE_KEY);
              const res = await activateQuestion(first.id, storedPassword);
              if (res.status === 401) {
                setShowPasswordPrompt(true);
              }
              setAdvancing(false);
            }}
            disabled={advancing}
            className="mt-8 px-6 py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#e8632b" }}
          >
            {advancing ? "Starting..." : "Start First Question"}
          </button>
        )}

        {showPasswordPrompt && (
          <form onSubmit={handlePasswordSubmit} className="mt-4 flex gap-2 items-center">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Admin password"
              className="border-2 rounded-lg px-3 py-2 text-sm outline-none"
              style={{ borderColor: passwordError ? "#e74c3c" : "#1a3a5c" }}
              autoFocus
            />
            <button
              type="submit"
              disabled={advancing}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "#1a3a5c" }}
            >
              Go
            </button>
            {passwordError && <span className="text-red-500 text-sm">{passwordError}</span>}
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f5f0e8" }}>
      {/* Branding — top right */}
      <div className="absolute top-3 right-4 select-none" style={{ color: "#1a3a5c", opacity: 0.55 }}>
        <span className="text-sm font-semibold tracking-wide">
          InPharma<sup className="text-[10px] ml-0.5 font-normal">2026</sup>
        </span>
      </div>

      {/* Question title */}
      <div className="px-8 pt-8 pb-4 max-w-4xl w-full mx-auto">
        <h1
          className="font-bold leading-tight"
          style={{ color: "#1a3a5c", fontSize: "clamp(44px, 6vw, 64px)" }}
        >
          {activeQuestion.title}
        </h1>
      </div>

      {/* Visualization area */}
      <div
        ref={vizRef}
        className="flex-1 flex items-center justify-center px-4 pb-8 w-full max-w-4xl mx-auto min-h-[300px]"
      >
        {activeQuestion.type === "multiple_choice" && results && isMCResults(results) && (
          <BarChart counts={results.counts} options={options} />
        )}

        {activeQuestion.type === "word_cloud" && results && isWordCloudResults(results) && (
          <WordCloud
            frequency={results.frequency}
            width={vizSize.width}
            height={vizSize.height}
          />
        )}

        {activeQuestion.type === "rating_scale" && results && isRatingResults(results) && (
          <RatingChart
            counts={results.counts}
            average={results.average}
            scaleMin={scaleMin}
            scaleMax={scaleMax}
            scaleMinLabel={activeQuestion.scaleMinLabel}
            scaleMaxLabel={activeQuestion.scaleMaxLabel}
          />
        )}
      </div>

      {/* QR code — bottom left */}
      {qrDataUrl && (
        <div className="absolute bottom-3 left-4">
          <img src={qrDataUrl} alt="Join" className="rounded" style={{ width: 80, height: 80, opacity: 0.85 }} />
        </div>
      )}

      {/* Bottom right: vote count + Next button */}
      <div className="absolute bottom-3 right-4 flex items-center gap-4">
        <span className="text-xs text-gray-400 select-none tabular-nums">
          {total} {voteLabel}
        </span>

        {nextQuestion && (
          <button
            onClick={handleNextQuestion}
            disabled={advancing}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#e8632b", opacity: 0.85 }}
          >
            {advancing ? "..." : "Next →"}
          </button>
        )}
      </div>

      {/* Password prompt overlay */}
      {showPasswordPrompt && (
        <div className="absolute bottom-16 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <form onSubmit={handlePasswordSubmit} className="flex gap-2 items-center">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Admin password"
              className="border-2 rounded-lg px-3 py-2 text-sm outline-none"
              style={{ borderColor: passwordError ? "#e74c3c" : "#1a3a5c" }}
              autoFocus
            />
            <button
              type="submit"
              disabled={advancing}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "#1a3a5c" }}
            >
              Go
            </button>
          </form>
          {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
        </div>
      )}
    </div>
  );
}
