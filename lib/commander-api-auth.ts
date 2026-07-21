import { cookies } from "next/headers";
import { COMMANDER_SESSION_COOKIE, verifyCommanderSession } from "./commander-auth";

export async function hasCommanderApiSession() {
  const cookieStore = await cookies();
  try {
    return verifyCommanderSession(cookieStore.get(COMMANDER_SESSION_COOKIE)?.value);
  } catch {
    return false;
  }
}

