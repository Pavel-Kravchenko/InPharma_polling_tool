"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminGuard } from "./AdminGuard";
import type { AuthFetch } from "@/lib/useAdminAuth";

interface Presentation {
  id: string;
  title: string;
  roomCode: string;
  createdAt: string;
  _count?: { questions: number };
}

function AdminDashboardInner({ authFetch }: { authFetch: AuthFetch }) {
  const router = useRouter();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});

  async function fetchPresentations() {
    const res = await authFetch("/api/presentations");
    const data = await res.json();
    setPresentations(data);
    setLoading(false);

    const counts: Record<string, number> = {};
    await Promise.all(
      data.map(async (p: Presentation) => {
        const r = await authFetch(`/api/presentations/${p.id}`);
        const full = await r.json();
        counts[p.id] = full.questions?.length ?? 0;
      })
    );
    setQuestionCounts(counts);
  }

  useEffect(() => {
    fetchPresentations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await authFetch("/api/presentations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (res.ok) {
      setNewTitle("");
      setShowNewForm(false);
      await fetchPresentations();
    }
    setCreating(false);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    await authFetch(`/api/presentations/${id}`, { method: "DELETE" });
    setPresentations((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f0e8" }}>
      <header style={{ backgroundColor: "#1a3a5c" }} className="px-8 py-5 flex items-center justify-between shadow">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">InPharma meter</h1>
          <p className="text-sm mt-0.5" style={{ color: "#93b5d3" }}>Admin Dashboard</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-5 py-2.5 rounded-lg font-semibold text-white text-sm transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: "#e8632b" }}
        >
          + New Presentation
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {showNewForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
            <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
              <h2 className="text-xl font-bold mb-5" style={{ color: "#1a3a5c" }}>New Presentation</h2>
              <form onSubmit={handleCreate}>
                <label className="block text-sm font-medium mb-1" style={{ color: "#1a3a5c" }}>
                  Title
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Career Symposium 2026"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 mb-5"
                  style={{ focusRingColor: "#1a3a5c" } as React.CSSProperties}
                />
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowNewForm(false); setNewTitle(""); }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newTitle.trim()}
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: "#e8632b" }}
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <h2 className="text-lg font-semibold mb-5" style={{ color: "#1a3a5c" }}>
          Presentations
        </h2>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading...</div>
        ) : presentations.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">No presentations yet.</p>
            <button
              onClick={() => setShowNewForm(true)}
              className="px-5 py-2.5 rounded-lg font-semibold text-white text-sm"
              style={{ backgroundColor: "#e8632b" }}
            >
              Create your first presentation
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {presentations.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 px-6 py-5 hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => router.push(`/admin/${p.id}`)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="font-semibold text-base truncate" style={{ color: "#1a3a5c" }}>{p.title}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>
                      Room: <span className="font-mono font-bold" style={{ color: "#e8632b" }}>{p.roomCode}</span>
                    </span>
                    <span>
                      {questionCounts[p.id] !== undefined
                        ? `${questionCounts[p.id]} question${questionCounts[p.id] !== 1 ? "s" : ""}`
                        : "Loading..."}
                    </span>
                    <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.title); }}
                  disabled={deletingId === p.id}
                  className="ml-auto flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {deletingId === p.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminGuard>
      {(authFetch) => <AdminDashboardInner authFetch={authFetch} />}
    </AdminGuard>
  );
}
