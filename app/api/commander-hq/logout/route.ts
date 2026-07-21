import { NextResponse } from "next/server";
import { COMMANDER_SESSION_COOKIE, commanderCookieOptions } from "@/lib/commander-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(COMMANDER_SESSION_COOKIE, "", { ...commanderCookieOptions(), maxAge: 0 });
  return response;
}

