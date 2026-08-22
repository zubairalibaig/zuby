"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { copy } from "@/lib/copy/en";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const c = copy.login;

  async function sendOtp() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setCodeSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(c.codeError);
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      });
      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-bold text-neutral-900">{c.heading}</h1>
      <p className="mt-1 text-sm text-neutral-500">{c.subheading}</p>

      <div className="mt-8 w-full space-y-4">
        {!codeSent ? (
          <>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                {c.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={c.emailPlaceholder}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-zuby-500 focus:ring-1 focus:ring-zuby-500 focus:outline-none"
                autoComplete="email"
              />
            </div>
            <button
              type="button"
              onClick={sendOtp}
              disabled={loading || !email}
              className="w-full rounded-lg bg-zuby-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
            >
              {loading ? "Sending…" : c.sendCode}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-600">
              {c.codeSent} <strong>{email}</strong>
            </p>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-neutral-700">
                {c.codeLabel}
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-center text-lg tracking-[0.3em] font-mono focus:border-zuby-500 focus:ring-1 focus:ring-zuby-500 focus:outline-none"
                autoComplete="one-time-code"
              />
            </div>
            <button
              type="button"
              onClick={verifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full rounded-lg bg-zuby-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
            >
              {loading ? "Verifying…" : c.verifyCode}
            </button>
            <button
              type="button"
              onClick={() => { setCodeSent(false); setOtp(""); setError(null); }}
              className="w-full text-sm text-neutral-500 hover:text-neutral-700"
            >
              Use a different email
            </button>
          </>
        )}

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-neutral-400">{c.orDivider}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {c.googleCta}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
