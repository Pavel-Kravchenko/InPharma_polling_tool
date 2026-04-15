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

  // Auth state — login happens once on page load
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Navigation state
  const [advancing, setAdvancing] = useState(false);

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

  // Check auth on mount — try stored password or no-password mode
  useEffect(() => {
    async function checkAuth() {
      const stored = sessionStorage.getItem(ADMIN_STORAGE_KEY);

      // Try stored password first
      if (stored) {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: stored }),
        });
        if (res.ok) {
          setAuthenticated(true);
          setCheckingAuth(false);
          return;
        }
        sessionStorage.removeItem(ADMIN_STORAGE_KEY);
      }

      // Try without password (maybe ADMIN_PASSWORD is not set)
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setAuthenticated(true);
      }
      setCheckingAuth(false);
    }
    checkAuth();
  }, []);

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
    QRCode.toDataURL(joinUrl, { width: 200, margin: 1 }).then(setQrDataUrl);
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

  // Navigation helpers
  function getAdjacentQuestion(direction: "next" | "back"): Question | null {
    if (!presentation || !activeQuestion) return null;
    const currentIdx = presentation.questions.findIndex((q) => q.id === activeQuestion.id);
    if (currentIdx === -1) return null;
    const targetIdx = direction === "next" ? currentIdx + 1 : currentIdx - 1;
    if (targetIdx < 0 || targetIdx >= presentation.questions.length) return null;
    return presentation.questions[targetIdx];
  }

  async function activateQuestion(questionId: string) {
    const password = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (password) headers["x-admin-password"] = password;

    return fetch(`/api/presentations/${presentationId}/activate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ questionId }),
    });
  }

  async function handleResetVotes() {
    if (!activeQuestion) return;
    const password = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    const headers: Record<string, string> = {};
    if (password) headers["x-admin-password"] = password;

    await fetch(`/api/questions/${activeQuestion.id}/reset`, {
      method: "POST",
      headers,
    });
    // Fetch fresh (empty) results
    const r = await fetch(`/api/questions/${activeQuestion.id}/results`);
    const fresh = await r.json();
    setResults(fresh);
  }

  async function handleNavigate(direction: "next" | "back") {
    const target = getAdjacentQuestion(direction);
    if (!target) return;
    setAdvancing(true);
    await activateQuestion(target.id);
    setAdvancing(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordInput }),
    });
    if (res.ok) {
      sessionStorage.setItem(ADMIN_STORAGE_KEY, passwordInput);
      setAuthenticated(true);
      setPasswordInput("");
    } else {
      setPasswordError("Wrong password");
    }
  }

  // Loading state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f0e8" }}>
        <p className="text-red-500 text-center px-6">{error}</p>
      </div>
    );
  }

  if (!presentation || checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f0e8" }}>
        <p className="text-gray-400 text-center">Loading...</p>
      </div>
    );
  }

  // Login screen — shown once before anything else
  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: "#f5f0e8" }}>
        <div className="absolute top-3 right-4 select-none" style={{ color: "#1a3a5c", opacity: 0.55 }}>
          <span className="text-sm font-semibold tracking-wide">
            InPharma<sup className="text-[10px] ml-0.5 font-normal">2026</sup>
          </span>
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ color: "#1a3a5c" }}>Presenter Login</h1>
        <p className="text-gray-500 mb-6">Enter admin password to control the poll</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-3 items-center">
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Admin password"
            className="border-2 rounded-lg px-4 py-3 text-base outline-none w-64 text-center"
            style={{ borderColor: passwordError ? "#e74c3c" : "#1a3a5c" }}
            autoFocus
          />
          {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
          <button
            type="submit"
            className="px-6 py-3 rounded-lg text-white font-semibold w-64"
            style={{ backgroundColor: "#e8632b" }}
          >
            Log In
          </button>
        </form>
      </div>
    );
  }

  const nextQuestion = getAdjacentQuestion("next");
  const prevQuestion = getAdjacentQuestion("back");
  const options: string[] = activeQuestion?.options ? JSON.parse(activeQuestion.options) : [];
  const scaleMin = activeQuestion?.scaleMin ?? 1;
  const scaleMax = activeQuestion?.scaleMax ?? 5;
  const total = activeQuestion && results ? totalVotes(results, activeQuestion.type) : 0;
  const voteLabel = activeQuestion?.type === "word_cloud" ? "responses" : "votes";

  // Waiting state — no active question yet
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
          <div className="absolute bottom-4 left-4">
            <img src={qrDataUrl} alt="Join" className="rounded" style={{ width: 200, height: 200, opacity: 0.85 }} />
          </div>
        )}

        {presentation.questions.length > 0 && (
          <button
            onClick={async () => {
              setAdvancing(true);
              await activateQuestion(presentation.questions[0].id);
              setAdvancing(false);
            }}
            disabled={advancing}
            className="mt-8 px-6 py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#e8632b" }}
          >
            {advancing ? "Starting..." : "Start First Question"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f5f0e8" }}>
      {/* Reset — top left */}
      <button
        onClick={handleResetVotes}
        className="absolute top-3 left-4 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-100"
        style={{ backgroundColor: "#e74c3c", color: "white", opacity: 0.6 }}
      >
        Reset Votes
      </button>

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
        <div className="absolute bottom-4 left-4">
          <img src={qrDataUrl} alt="Join" className="rounded" style={{ width: 200, height: 200, opacity: 0.85 }} />
        </div>
      )}

      {/* Bottom right: vote count + Back/Next buttons */}
      <div className="absolute bottom-3 right-4 flex items-center gap-4">
        <span className="text-xs text-gray-400 select-none tabular-nums">
          {total} {voteLabel}
        </span>

        {prevQuestion && (
          <button
            onClick={() => handleNavigate("back")}
            disabled={advancing}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#1a3a5c", color: "white", opacity: 0.85 }}
          >
            {advancing ? "..." : "← Back"}
          </button>
        )}

        {nextQuestion && (
          <button
            onClick={() => handleNavigate("next")}
            disabled={advancing}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#e8632b", opacity: 0.85 }}
          >
            {advancing ? "..." : "Next →"}
          </button>
        )}
      </div>
    </div>
  );
}
