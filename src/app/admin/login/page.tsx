"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

/**
 * Admin sign-in. Google OAuth only in V1 (the admins allow-list decides who
 * actually gets in — signing in with Google is not itself access). Lives
 * OUTSIDE the /admin route group's gate so it's always reachable; every other
 * /admin path 404s for non-admins.
 */
export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin` },
      });
      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-bold text-zuby-900">Zuby Admin</h1>
      <p className="mt-1 text-sm text-neutral-500">Sign in to manage listings.</p>
      <button
        type="button"
        onClick={signIn}
        disabled={loading}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
