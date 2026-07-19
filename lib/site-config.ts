export const siteConfig = {
  name: "Groypers Alpha Squadron",
  abbreviation: "GAS",
  token: "$GROYPER",
  supply: 777,
  network: "Solana",
  contractAddress: "44eFuquSFU8aC6Nn3LWmNapFn8f5WzwxrYEnJXjspump",
  twitterUrl: "https://x.com/GroyperPump",
  discordUrl: "",
  launchMyNftUrl: "[LAUNCHMYNFT_URL]",
  knowYourMemeUrl: "https://knowyourmeme.com/memes/groyper",
  tokenUrl: "https://swap.pump.fun/?input=So11111111111111111111111111111111111111112&output=44eFuquSFU8aC6Nn3LWmNapFn8f5WzwxrYEnJXjspump",
  tokenWebsiteUrl: "https://groyperpump.fun/",
  creatorName: "Screamvision",
  creatorTwitterUrl: "https://x.com/scream_vision",
  siteUrl: "https://groypersquadron.xyz",
  canonicalUrl: "https://www.groypersquadron.xyz",
  stats: {
    deployed: 521,
    commanders: 184,
    largestArmy: 67,
  },
  roadmap: [
    { phase: "01", title: "ESTABLISH THE UNIT", status: "COMPLETED", state: "complete" },
    { phase: "02", title: "DEPLOY THE SQUADRON", status: "PENDING DEPLOYMENT", state: "active" },
    { phase: "03", title: "COMPLETE THE FIRST OPERATION", status: "AWAITING FULL DEPLOYMENT", state: "pending" },
    { phase: "04", title: "THE 4,444 EXPANSION", status: "LOCKED UNTIL ALL 777 ARE SOLD", state: "locked" },
  ],
} as const;

export function safeExternalUrl(value: string) {
  return /^https?:\/\//.test(value) ? value : "#";
}
