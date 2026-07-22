import { unstable_cache } from "next/cache";
import { getCommanderAlias, getPublicCommanderProfile } from "./commander-profile-store";

export const cachedPublicCommanderProfile = unstable_cache(
  async (usernameNormalized: string) => getPublicCommanderProfile(usernameNormalized),
  ["public-commander-profile"],
  { revalidate: 300, tags: ["commander-profiles"] },
);

export const cachedCommanderAlias = unstable_cache(
  async (usernameNormalized: string) => getCommanderAlias(usernameNormalized),
  ["public-commander-profile-alias"],
  { revalidate: 300, tags: ["commander-profiles"] },
);

