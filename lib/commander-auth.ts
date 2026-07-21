import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const COMMANDER_SESSION_COOKIE = "gas_commander_hq";
export const COMMANDER_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

type SessionPayload = {
  version: 1;
  expiresAt: number;
};

function production() {
  return process.env.NODE_ENV === "production";
}

function password() {
  const configured = process.env.COMMANDER_HQ_PASSWORD;
  if (configured) return configured;
  if (!production()) return "1337";
  throw new Error("COMMANDER_HQ_PASSWORD is not configured.");
}

function sessionSecret() {
  const configured = process.env.COMMANDER_HQ_SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (!production()) return "gas-commander-hq-development-secret-only";
  throw new Error("COMMANDER_HQ_SESSION_SECRET is not configured or is too short.");
}

function sign(encoded: string) {
  return createHmac("sha256", sessionSecret()).update(encoded).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function verifyCommanderPassword(candidate: string) {
  return safeEqual(candidate, password());
}

export function createCommanderSession() {
  const payload: SessionPayload = {
    version: 1,
    expiresAt: Date.now() + COMMANDER_SESSION_MAX_AGE * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyCommanderSession(value?: string) {
  if (!value) return false;
  const [encoded, suppliedSignature] = value.split(".");
  if (!encoded || !suppliedSignature) return false;
  const expectedSignature = sign(encoded);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    return payload.version === 1 && payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function commanderCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: production(),
    path: "/",
    maxAge: COMMANDER_SESSION_MAX_AGE,
  };
}

