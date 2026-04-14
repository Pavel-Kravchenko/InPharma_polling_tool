"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/presentations/join/${trimmed}`);
      if (!res.ok) {
        setError("Room not found. Check the code and try again.");
        return;
      }
      router.push(`/join/${trimmed}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f5f0e8" }}>
      <header
        className="w-full py-5 px-6 text-center"
        style={{ backgroundColor: "#1a3a5c" }}
      >
        <h1 className="text-2xl font-bold text-white tracking-wide">InPharma meter</h1>
        <p className="text-sm text-white/70 mt-1">Live audience polling</p>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-md p-8">
            <p className="text-center text-gray-600 mb-6 text-base">
              Enter the code shown on screen
            </p>

            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setError(null);
                  setCode(e.target.value.replace(/\D/g, ""));
                }}
                placeholder="e.g. 4729"
                className="w-full text-center text-3xl font-bold tracking-widest border-2 rounded-xl py-4 px-4 outline-none transition-colors"
                style={{
                  borderColor: error ? "#ef4444" : "#1a3a5c",
                  color: "#1a3a5c",
                }}
                autoFocus
              />

              {error && (
                <p className="text-center text-red-500 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || code.length === 0}
                className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#e8632b" }}
              >
                {loading ? "Joining..." : "Join"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
