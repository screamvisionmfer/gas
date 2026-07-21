import { NextResponse } from "next/server";
import {
  COMMANDER_SESSION_COOKIE,
  commanderCookieOptions,
  createCommanderSession,
  verifyCommanderPassword,
} from "@/lib/commander-auth";
import {
  clearCommanderFailures,
  rateLimitStatus,
  recordCommanderFailure,
  requestIp,
} from "@/lib/commander-rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = requestIp(request.headers);
  const status = rateLimitStatus(ip);
  if (status.blocked) {
    return NextResponse.json(
      { error: "TEMPORARILY RATE-LIMITED", retryAfter: status.retryAfter },
      { status: 429, headers: { "Retry-After": String(status.retryAfter), "Cache-Control": "no-store" } },
    );
  }

  try {
    const body = (await request.json()) as { password?: string };
    const candidate = typeof body.password === "string" ? body.password.slice(0, 256) : "";
    if (!verifyCommanderPassword(candidate)) {
      const failure = recordCommanderFailure(ip);
      const responseStatus = failure.blocked ? 429 : 401;
      return NextResponse.json(
        { error: failure.blocked ? "TEMPORARILY RATE-LIMITED" : "ACCESS DENIED — INVALID CODE", retryAfter: failure.retryAfter },
        { status: responseStatus, headers: { "Cache-Control": "no-store" } },
      );
    }

    clearCommanderFailures(ip);
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(COMMANDER_SESSION_COOKIE, createCommanderSession(), commanderCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error && error.message.includes("COMMANDER_HQ_")
      ? "COMMANDER HQ IS NOT CONFIGURED"
      : "SECURE NETWORK ERROR";
    return NextResponse.json({ error: message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

