const MAX_ATTEMPTS = 5;
const BLOCK_MS = 10 * 60 * 1000;

type AttemptState = {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
};

declare global {
  var gasCommanderAttempts: Map<string, AttemptState> | undefined;
}

const attempts = globalThis.gasCommanderAttempts ?? new Map<string, AttemptState>();
globalThis.gasCommanderAttempts = attempts;

export function rateLimitStatus(ip: string) {
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current) return { blocked: false, retryAfter: 0 };
  if (current.blockedUntil && current.blockedUntil > now) {
    return { blocked: true, retryAfter: Math.ceil((current.blockedUntil - now) / 1000) };
  }
  if (now - current.firstAttemptAt >= BLOCK_MS) attempts.delete(ip);
  return { blocked: false, retryAfter: 0 };
}

export function recordCommanderFailure(ip: string) {
  const now = Date.now();
  const current = attempts.get(ip);
  const state: AttemptState = !current || now - current.firstAttemptAt >= BLOCK_MS
    ? { attempts: 1, firstAttemptAt: now }
    : { ...current, attempts: current.attempts + 1 };
  if (state.attempts >= MAX_ATTEMPTS) state.blockedUntil = now + BLOCK_MS;
  attempts.set(ip, state);
  return rateLimitStatus(ip);
}

export function clearCommanderFailures(ip: string) {
  attempts.delete(ip);
}

export function requestIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")?.trim()
    || "unknown";
}
