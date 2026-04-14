"use client";
import { useState } from "react";
import { useAdminAuth, type AuthFetch } from "@/lib/useAdminAuth";

export function AdminGuard({ children }: { children: (authFetch: AuthFetch) => React.ReactNode }) {
  const { authenticated, checking, error, login, authFetch } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f0e8" }}>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f0e8" }}>
        <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold mb-1" style={{ color: "#1a3a5c" }}>InPharma meter</h1>
          <p className="text-sm text-gray-500 mb-6">Enter admin password to continue</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              await login(password);
              setSubmitting(false);
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 mb-3"
              style={{ focusRingColor: "#1a3a5c" } as React.CSSProperties}
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#e8632b" }}
            >
              {submitting ? "Checking..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children(authFetch)}</>;
}
