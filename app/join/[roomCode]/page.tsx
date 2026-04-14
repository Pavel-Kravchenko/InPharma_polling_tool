"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useEventSource } from "@/lib/useEventSource";

interface Question {
  id: string;
  type: "multiple_choice" | "word_cloud" | "rating_scale";
  title: string;
  options: string | null;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
}

interface Presentation {
  id: string;
  title: string;
  roomCode: string;
  activeQuestion: Question | null;
}

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("inpharma-device-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("inpharma-device-id", id);
  }
  return id;
}

// --- Multiple Choice ---

function MultipleChoice({ question }: { question: Question }) {
  const options: string[] = question.options ? JSON.parse(question.options) : [];
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!selected) return;
    setLoading(true);
    await fetch(`/api/questions/${question.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: selected, deviceId: getDeviceId() }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="text-center text-gray-500 text-lg mt-8">
        Vote submitted! Waiting for next question...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => {
        const isSelected = selected === option;
        return (
          <button
            key={option}
            onClick={() => setSelected(option)}
            className="w-full text-left py-4 px-5 rounded-xl border-2 text-base font-medium transition-colors min-h-[52px]"
            style={{
              borderColor: isSelected ? "#e8632b" : "#d1d5db",
              backgroundColor: isSelected ? "#fff3ee" : "#ffffff",
              color: isSelected ? "#e8632b" : "#1a3a5c",
            }}
          >
            {option}
          </button>
        );
      })}

      <button
        onClick={handleSubmit}
        disabled={!selected || loading}
        className="w-full py-4 rounded-xl text-white font-semibold text-lg mt-2 transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "#e8632b" }}
      >
        {loading ? "Submitting..." : "Submit Vote"}
      </button>
    </div>
  );
}

// --- Word Cloud ---

function WordCloud({ question }: { question: Question }) {
  const MAX_SUBMISSIONS = 3;
  const [word, setWord] = useState("");
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const done = submitted.length >= MAX_SUBMISSIONS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = word.trim();
    if (!trimmed || done) return;
    setLoading(true);
    await fetch(`/api/questions/${question.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: trimmed, deviceId: getDeviceId() }),
    });
    setLoading(false);
    setSubmitted((prev) => [...prev, trimmed]);
    setWord("");
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 text-right">
        {submitted.length}/{MAX_SUBMISSIONS} submitted
      </p>

      {submitted.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {submitted.map((w, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: "#e8632b" }}
            >
              {w}
            </span>
          ))}
        </div>
      )}

      {!done && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Type a word..."
            className="w-full border-2 rounded-xl py-4 px-4 text-base outline-none"
            style={{ borderColor: "#1a3a5c", color: "#1a3a5c" }}
            autoFocus
          />
          <button
            type="submit"
            disabled={!word.trim() || loading}
            className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#e8632b" }}
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}

// --- Rating Scale ---

function RatingScale({ question }: { question: Question }) {
  const min = question.scaleMin ?? 1;
  const max = question.scaleMax ?? 5;
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (selected === null) return;
    setLoading(true);
    await fetch(`/api/questions/${question.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: String(selected), deviceId: getDeviceId() }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="text-center text-gray-500 text-lg mt-8">Vote submitted!</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {(question.scaleMinLabel || question.scaleMaxLabel) && (
        <div className="flex justify-between text-sm text-gray-500">
          <span>{question.scaleMinLabel}</span>
          <span>{question.scaleMaxLabel}</span>
        </div>
      )}

      <div className="flex gap-2 flex-wrap justify-center">
        {numbers.map((n) => {
          const isSelected = selected === n;
          return (
            <button
              key={n}
              onClick={() => setSelected(n)}
              className="flex-1 min-w-[48px] min-h-[52px] rounded-xl border-2 font-bold text-lg transition-colors"
              style={{
                borderColor: isSelected ? "#e8632b" : "#d1d5db",
                backgroundColor: isSelected ? "#e8632b" : "#ffffff",
                color: isSelected ? "#ffffff" : "#1a3a5c",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={selected === null || loading}
        className="w-full py-4 rounded-xl text-white font-semibold text-lg mt-2 transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "#e8632b" }}
      >
        {loading ? "Submitting..." : "Submit Vote"}
      </button>
    </div>
  );
}

// --- Question Renderer ---

function QuestionView({ question }: { question: Question }) {
  return (
    <div>
      <h2
        className="text-xl font-semibold mb-6 leading-snug"
        style={{ color: "#1a3a5c" }}
      >
        {question.title}
      </h2>

      {question.type === "multiple_choice" && <MultipleChoice question={question} />}
      {question.type === "word_cloud" && <WordCloud question={question} />}
      {question.type === "rating_scale" && <RatingScale question={question} />}
    </div>
  );
}

// --- Main Page ---

export default function VotingPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/presentations/join/${roomCode}`)
      .then((r) => {
        if (!r.ok) throw new Error("Room not found");
        return r.json();
      })
      .then((data: Presentation) => {
        setPresentation(data);
        setActiveQuestion(data.activeQuestion);
      })
      .catch(() => setError("Room not found. Please go back and try again."));
  }, [roomCode]);

  const handleSSE = useCallback((data: unknown) => {
    const event = data as { type: string; question?: Question };
    if (event.type === "question_changed") {
      setActiveQuestion(event.question ?? null);
    }
  }, []);

  const sseUrl = presentation ? `/api/sse/presentation/${presentation.id}` : null;
  useEventSource(sseUrl, handleSSE);

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

  if (!presentation) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#f5f0e8" }}
      >
        <p className="text-gray-400 text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f5f0e8" }}>
      <header
        className="w-full py-4 px-6 flex items-center justify-between"
        style={{ backgroundColor: "#1a3a5c" }}
      >
        <h1 className="text-lg font-bold text-white tracking-wide">InPharma meter</h1>
        <span className="text-white/70 text-sm font-mono tracking-widest">{roomCode}</span>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-8">
        <div className="w-full max-w-sm">
          {activeQuestion ? (
            <div className="bg-white rounded-2xl shadow-md p-6" key={activeQuestion.id}>
              <QuestionView question={activeQuestion} />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-md p-8 text-center">
              <p className="text-gray-500 text-lg">
                Waiting for the presenter to start...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
