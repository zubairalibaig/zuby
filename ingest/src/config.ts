/**
 * Configuration and politeness settings.
 *
 * Credentials come from the environment. In browser-only operation these are
 * GitHub Actions secrets (Settings → Secrets and variables → Actions):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it as a GitHub Actions secret (Settings → Secrets and variables → Actions) or in your shell.`,
    );
  }
  return value;
}

/** Identify ourselves honestly to any site we fetch. */
export const USER_AGENT =
  "ZubyDirectoryBot/0.1 (+https://zuby.food; home-chef directory; contact: hello@zuby.food)";

export interface SourcePolicy {
  /** Minimum milliseconds between requests to the same host. */
  minDelayMs: number;
  /** Give up on a single request after this long. */
  timeoutMs: number;
  /** Maximum pages to fetch in one run. */
  maxPages: number;
}

export const DEFAULT_POLICY: SourcePolicy = {
  minDelayMs: 2000,
  timeoutMs: 15000,
  maxPages: 50,
};

/** The city every Bangalore-sourced listing belongs to until we expand. */
export const DEFAULT_CITY_SLUG = "bangalore";
