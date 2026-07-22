import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireVerifiedCommander, CommanderProfileAuthError } from "@/lib/commander-profile-auth";
import { type CommanderProfileMutation } from "@/lib/commander-profile-types";
import { CommanderProfileStoreError, getCommanderProfileByPrivyId, unpublishCommanderProfile } from "@/lib/commander-profile-store";
import { chooseFeaturedSoldier, CommanderProfileServiceError, publicProfileUrl, syncCommanderProfile } from "@/lib/commander-profile-service";

export const runtime = "nodejs";

function response(profile: Awaited<ReturnType<typeof getCommanderProfileByPrivyId>>) {
  return NextResponse.json({ profile, profileUrl: profile ? publicProfileUrl(profile) : undefined });
}

function errorResponse(error: unknown) {
  if (error instanceof CommanderProfileAuthError || error instanceof CommanderProfileServiceError || error instanceof CommanderProfileStoreError) {
    const status = error instanceof CommanderProfileStoreError ? (error.code === "USERNAME_COLLISION" ? 409 : 503) : error.status;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  return NextResponse.json({ error: "COMMANDER_PROFILE_UNAVAILABLE", message: "Commander profile service is temporarily unavailable." }, { status: 500 });
}

function refresh(profile: NonNullable<Awaited<ReturnType<typeof getCommanderProfileByPrivyId>>>) {
  revalidateTag("commander-profiles", "max");
  revalidatePath(`/commander/${profile.usernameNormalized}`);
  revalidatePath(`/commander/${profile.usernameNormalized}/opengraph-image`);
}

export async function GET(request: Request) {
  try {
    const identity = await requireVerifiedCommander(request);
    return response(await getCommanderProfileByPrivyId(identity.privyId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requireVerifiedCommander(request);
    const body = await request.json() as { publicConsent?: boolean };
    if (body.publicConsent !== true) return NextResponse.json({ error: "PUBLIC_CONSENT_REQUIRED", message: "Confirm that the profile will be public." }, { status: 422 });
    const profile = await syncCommanderProfile(identity, { publish: true, bypassRateLimit: true });
    refresh(profile);
    return response(profile);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const identity = await requireVerifiedCommander(request);
    const body = await request.json() as CommanderProfileMutation;
    let profile;

    if (body.action === "sync") {
      const existing = await getCommanderProfileByPrivyId(identity.privyId);
      if (!existing?.isPublic) return NextResponse.json({ error: "PROFILE_NOT_PUBLIC", message: "Publish the Commander profile before syncing it." }, { status: 409 });
      profile = await syncCommanderProfile(identity, { publish: false });
    }
    else if (body.action === "set-featured" && typeof body.mint === "string") profile = await chooseFeaturedSoldier(identity, body.mint.trim());
    else if (body.action === "unpublish") profile = await unpublishCommanderProfile(identity.privyId);
    else if (body.action === "publish" && body.publicConsent === true) profile = await syncCommanderProfile(identity, { publish: true, bypassRateLimit: true });
    else return NextResponse.json({ error: "INVALID_PROFILE_ACTION", message: "Unsupported profile action." }, { status: 400 });

    if (!profile) return NextResponse.json({ error: "PROFILE_NOT_FOUND", message: "Commander profile not found." }, { status: 404 });
    refresh(profile);
    return response(profile);
  } catch (error) {
    return errorResponse(error);
  }
}
