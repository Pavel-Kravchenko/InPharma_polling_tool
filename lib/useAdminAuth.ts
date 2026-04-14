"use client";
import { useState, useEffect, useCallback } from "react";

export type AuthFetch = (url: string, opts?: RequestInit) => Promise<Response>;

const STORAGE_KEY = "inpharma-admin-password";

export function useAdminAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const getPassword = () =>
    typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null;

  // Check if already authenticated on mount
  useEffect(() => {
    const stored = getPassword();
    if (stored) {
      fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: stored }),
      }).then((r) => {
        setAuthenticated(r.ok);
        if (!r.ok) sessionStorage.removeItem(STORAGE_KEY);
        setChecking(false);
      });
    } else {
      // Try with no password (maybe ADMIN_PASSWORD is not set)
      fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((r) => {
        setAuthenticated(r.ok);
        setChecking(false);
      });
    }
  }, []);

  const login = useCallback(async (password: string) => {
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      sessionStorage.setItem(STORAGE_KEY, password);
      setAuthenticated(true);
      return true;
    }
    setError("Wrong password");
    return false;
  }, []);

  // Helper to add auth header to fetch calls
  const authFetch = useCallback((url: string, opts: RequestInit = {}) => {
    const password = getPassword();
    const headers = new Headers(opts.headers);
    if (password) headers.set("x-admin-password", password);
    return fetch(url, { ...opts, headers });
  }, []);

  return { authenticated, checking, error, login, authFetch };
}
