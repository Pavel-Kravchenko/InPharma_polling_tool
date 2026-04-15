"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { AdminGuard } from "../AdminGuard";
import type { AuthFetch } from "@/lib/useAdminAuth";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  createdAt: string;
  questions: Question[];
}

type QuestionType = "multiple_choice" | "word_cloud" | "rating_scale";

interface QuestionFormState {
  type: QuestionType;
  title: string;
  options: string[];
  scaleMin: number;
  scaleMax: number;
  scaleMinLabel: string;
  scaleMaxLabel: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple Choice",
  word_cloud: "Word Cloud",
  rating_scale: "Rating Scale",
};

const TYPE_COLORS: Record<QuestionType, string> = {
  multiple_choice: "#1a3a5c",
  word_cloud: "#7c3aed",
  rating_scale: "#0369a1",
};

function emptyForm(): QuestionFormState {
  return {
    type: "multiple_choice",
    title: "",
    options: ["", ""],
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "",
    scaleMaxLabel: "",
  };
}

function formFromQuestion(q: Question): QuestionFormState {
  return {
    type: q.type,
    title: q.title,
    options: q.options ? JSON.parse(q.options) : ["", ""],
    scaleMin: q.scaleMin ?? 1,
    scaleMax: q.scaleMax ?? 5,
    scaleMinLabel: q.scaleMinLabel ?? "",
    scaleMaxLabel: q.scaleMaxLabel ?? "",
  };
}

// ─── QuestionForm (Add/Edit modal) ───────────────────────────────────────────

function QuestionForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: QuestionFormState;
  onSave: (form: QuestionFormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<QuestionFormState>(initial);

  function setField<K extends keyof QuestionFormState>(key: K, value: QuestionFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setOption(idx: number, value: string) {
    setForm((prev) => {
      const opts = [...prev.options];
      opts[idx] = value;
      return { ...prev, options: opts };
    });
  }

  function addOption() {
    setForm((prev) => ({ ...prev, options: [...prev.options, ""] }));
  }

  function removeOption(idx: number) {
    setForm((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type selector */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: "#1a3a5c" }}>
          Question Type
        </label>
        <div className="flex gap-2">
          {(["multiple_choice", "word_cloud", "rating_scale"] as QuestionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setField("type", t)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold border transition-all"
              style={{
                backgroundColor: form.type === t ? TYPE_COLORS[t] : "white",
                color: form.type === t ? "white" : "#374151",
                borderColor: form.type === t ? TYPE_COLORS[t] : "#d1d5db",
              }}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: "#1a3a5c" }}>
          Question Title
        </label>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          placeholder="Enter your question..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* Multiple choice options */}
      {form.type === "multiple_choice" && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "#1a3a5c" }}>
            Options
          </label>
          <div className="space-y-2">
            {form.options.map((opt, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={opt}
                  required
                  onChange={(e) => setOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                {form.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                    title="Remove option"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addOption}
            className="mt-2 text-sm font-medium hover:underline"
            style={{ color: "#e8632b" }}
          >
            + Add option
          </button>
        </div>
      )}

      {/* Rating scale settings */}
      {form.type === "rating_scale" && (
        <div className="space-y-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1" style={{ color: "#1a3a5c" }}>Min</label>
              <input
                type="number"
                value={form.scaleMin}
                onChange={(e) => setField("scaleMin", Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1" style={{ color: "#1a3a5c" }}>Max</label>
              <input
                type="number"
                value={form.scaleMax}
                onChange={(e) => setField("scaleMax", Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1" style={{ color: "#1a3a5c" }}>Min Label</label>
              <input
                type="text"
                value={form.scaleMinLabel}
                onChange={(e) => setField("scaleMinLabel", e.target.value)}
                placeholder="e.g. Not at all"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1" style={{ color: "#1a3a5c" }}>Max Label</label>
              <input
                type="text"
                value={form.scaleMaxLabel}
                onChange={(e) => setField("scaleMaxLabel", e.target.value)}
                placeholder="e.g. Very confident"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Word cloud: only title needed */}
      {form.type === "word_cloud" && (
        <p className="text-sm text-gray-500 italic">
          Participants will type any word or phrase. Just a title is needed.
        </p>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#e8632b" }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

// ─── Inner Editor ────────────────────────────────────────────────────────────

function PresentationEditorInner({
  presentationId,
  authFetch,
}: {
  presentationId: string;
  authFetch: AuthFetch;
}) {
  const router = useRouter();

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingAll, setResettingAll] = useState(false);
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
  const [embedUrlCopied, setEmbedUrlCopied] = useState(false);

  const fetchPresentation = useCallback(async () => {
    const res = await authFetch(`/api/presentations/${presentationId}`);
    if (!res.ok) { router.push("/admin"); return; }
    const data: Presentation = await res.json();
    setPresentation(data);
    setLoading(false);

    const joinUrl = `${window.location.origin}/join/${data.roomCode}`;
    QRCode.toDataURL(joinUrl, { width: 200, margin: 2 }).then(setQrDataUrl);

    const counts: Record<string, number> = {};
    await Promise.all(
      data.questions.map(async (q) => {
        const r = await fetch(`/api/questions/${q.id}/results`);
        const results = await r.json();
        let total = 0;
        if (results.counts) {
          total = Object.values(results.counts as Record<string, number>).reduce((a, b) => a + b, 0);
        } else if (results.frequency) {
          total = Object.values(results.frequency as Record<string, number>).reduce((a, b) => a + b, 0);
        }
        counts[q.id] = total;
      })
    );
    setVoteCounts(counts);
  }, [presentationId, router, authFetch]);

  useEffect(() => {
    fetchPresentation();
  }, [fetchPresentation]);

  async function handleActivate(questionId: string) {
    setActivating(questionId);
    await authFetch(`/api/presentations/${presentationId}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId }),
    });
    await fetchPresentation();
    setActivating(null);
  }

  async function handleDeleteQuestion(q: Question) {
    if (!confirm(`Delete question "${q.title}"?`)) return;
    setDeletingId(q.id);
    await authFetch(`/api/questions/${q.id}`, { method: "DELETE" });
    await fetchPresentation();
    setDeletingId(null);
  }

  async function handleSaveNew(form: QuestionFormState) {
    setSaving(true);
    const body: Record<string, unknown> = {
      presentationId,
      type: form.type,
      title: form.title,
    };
    if (form.type === "multiple_choice") {
      body.options = form.options.filter((o) => o.trim());
    }
    if (form.type === "rating_scale") {
      body.scaleMin = form.scaleMin;
      body.scaleMax = form.scaleMax;
      body.scaleMinLabel = form.scaleMinLabel || null;
      body.scaleMaxLabel = form.scaleMaxLabel || null;
    }
    await authFetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setShowAddForm(false);
    await fetchPresentation();
    setSaving(false);
  }

  async function handleSaveEdit(form: QuestionFormState) {
    if (!editingQuestion) return;
    setSaving(true);
    const body: Record<string, unknown> = { title: form.title };
    if (form.type === "multiple_choice") {
      body.options = form.options.filter((o) => o.trim());
    }
    if (form.type === "rating_scale") {
      body.scaleMin = form.scaleMin;
      body.scaleMax = form.scaleMax;
      body.scaleMinLabel = form.scaleMinLabel || null;
      body.scaleMaxLabel = form.scaleMaxLabel || null;
    }
    await authFetch(`/api/questions/${editingQuestion.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditingQuestion(null);
    await fetchPresentation();
    setSaving(false);
  }

  async function handleResetAll() {
    if (!presentation) return;
    if (!confirm("Reset all votes for this presentation? This cannot be undone.")) return;
    setResettingAll(true);
    await Promise.all(
      presentation.questions.map((q) =>
        authFetch(`/api/questions/${q.id}/reset`, { method: "POST" })
      )
    );
    await fetchPresentation();
    setResettingAll(false);
  }

  function copyEmbedUrl(questionId: string) {
    const url = `${window.location.origin}/embed/${questionId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(questionId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function copyRoomCode() {
    if (!presentation) return;
    navigator.clipboard.writeText(presentation.roomCode).then(() => {
      setRoomCodeCopied(true);
      setTimeout(() => setRoomCodeCopied(false), 2000);
    });
  }

  function copyPresentationEmbedUrl() {
    const url = `${window.location.origin}/embed/presentation/${presentationId}`;
    navigator.clipboard.writeText(url).then(() => {
      setEmbedUrlCopied(true);
      setTimeout(() => setEmbedUrlCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f0e8" }}>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!presentation) return null;

  const isModalOpen = showAddForm || editingQuestion !== null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f0e8" }}>
      <header style={{ backgroundColor: "#1a3a5c" }} className="px-8 py-5 flex items-center gap-4 shadow">
        <button
          onClick={() => router.push("/admin")}
          className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          &larr; Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{presentation.title}</h1>
          <p className="text-sm mt-0.5" style={{ color: "#93b5d3" }}>Presentation Editor</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Presentation Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="rounded-lg border border-gray-200" style={{ width: 140, height: 140 }} />
            ) : (
              <div className="w-36 h-36 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                Generating QR...
              </div>
            )}
            <p className="text-xs text-gray-500">Scan to join</p>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 mb-1">Room Code</p>
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-5xl font-black tracking-widest font-mono leading-none"
                style={{ color: "#1a3a5c" }}
              >
                {presentation.roomCode}
              </span>
              <button
                onClick={copyRoomCode}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                style={{
                  borderColor: roomCodeCopied ? "#22c55e" : "#d1d5db",
                  color: roomCodeCopied ? "#22c55e" : "#6b7280",
                }}
              >
                {roomCodeCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Join URL:{" "}
              <span className="font-mono text-xs text-gray-600">
                {typeof window !== "undefined" ? `${window.location.origin}/join/${presentation.roomCode}` : ""}
              </span>
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {presentation.questions.length} question{presentation.questions.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={copyPresentationEmbedUrl}
              className="mt-3 px-4 py-2 rounded-lg text-xs font-semibold border transition-all"
              style={{
                borderColor: embedUrlCopied ? "#22c55e" : "#e8632b",
                color: embedUrlCopied ? "#22c55e" : "#e8632b",
                backgroundColor: embedUrlCopied ? "#f0fdf4" : "#fff3ee",
              }}
            >
              {embedUrlCopied ? "Copied!" : "Copy Presentation Embed URL"}
            </button>
          </div>
        </div>

        {/* Question List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: "#1a3a5c" }}>Questions</h2>
          </div>

          {presentation.questions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
              No questions yet. Add your first question below.
            </div>
          ) : (
            <div className="space-y-3">
              {presentation.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white rounded-xl shadow-sm border transition-all"
                  style={{
                    borderColor: q.isActive ? "#e8632b" : "#f3f4f6",
                    borderWidth: q.isActive ? 2 : 1,
                  }}
                >
                  <div className="px-5 py-4 flex flex-col sm:flex-row items-start gap-4">
                    <div className="flex items-start gap-4 w-full">
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: q.isActive ? "#e8632b" : "#1a3a5c" }}
                      >
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="font-medium text-sm" style={{ color: "#1a3a5c" }}>{q.title}</p>
                          {q.isActive && (
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: "#e8632b" }}
                            >
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span
                            className="px-2 py-0.5 rounded font-medium text-white"
                            style={{ backgroundColor: TYPE_COLORS[q.type] }}
                          >
                            {TYPE_LABELS[q.type]}
                          </span>
                          <span>{voteCounts[q.id] ?? "..."} votes</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap w-full sm:w-auto sm:justify-end">
                      <button
                        onClick={() => handleActivate(q.id)}
                        disabled={activating === q.id || q.isActive}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                        style={{
                          backgroundColor: q.isActive ? "#dcfce7" : "#16a34a",
                          color: q.isActive ? "#16a34a" : "white",
                        }}
                      >
                        {activating === q.id ? "Activating..." : q.isActive ? "Active" : "Activate"}
                      </button>

                      <button
                        onClick={() => setEditingQuestion(q)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-80"
                        style={{ backgroundColor: "#1a3a5c" }}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteQuestion(q)}
                        disabled={deletingId === q.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {deletingId === q.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-colors hover:border-orange-400 hover:text-orange-500"
            style={{ borderColor: "#d1d5db", color: "#9ca3af" }}
          >
            + Add Question
          </button>
        </section>

        {/* Reset Section */}
        {presentation.questions.length > 0 && (
          <section className="border-t border-gray-200 pt-6">
            <h2 className="text-base font-semibold mb-3" style={{ color: "#1a3a5c" }}>Danger Zone</h2>
            <button
              onClick={handleResetAll}
              disabled={resettingAll}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {resettingAll ? "Resetting..." : "Reset All Votes"}
            </button>
            <p className="text-xs text-gray-400 mt-1">Clears all votes for every question in this presentation.</p>
          </section>
        )}
      </main>

      {/* Modal: Add or Edit Question */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        >
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6" style={{ color: "#1a3a5c" }}>
              {editingQuestion ? "Edit Question" : "Add Question"}
            </h2>
            <QuestionForm
              initial={editingQuestion ? formFromQuestion(editingQuestion) : emptyForm()}
              onSave={editingQuestion ? handleSaveEdit : handleSaveNew}
              onCancel={() => { setShowAddForm(false); setEditingQuestion(null); }}
              saving={saving}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PresentationEditor({
  params,
}: {
  params: Promise<{ presentationId: string }>;
}) {
  const { presentationId } = use(params);

  return (
    <AdminGuard>
      {(authFetch) => (
        <PresentationEditorInner
          presentationId={presentationId}
          authFetch={authFetch}
        />
      )}
    </AdminGuard>
  );
}
