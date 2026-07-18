export const siteConfig = {
  name: "Groypers Alpha Squadron",
  abbreviation: "GAS",
  token: "$GROYPERS",
  supply: 777,
  network: "Solana",
  contractAddress: "[GROYPERS_CA]",
  twitterUrl: "[TWITTER_URL]",
  discordUrl: "",
  launchMyNftUrl: "[LAUNCHMYNFT_URL]",
  knowYourMemeUrl: "[KNOWYOURMEME_URL]",
  tokenUrl: "[TOKEN_URL]",
  creatorName: "Screamvision",
  siteUrl: "http://localhost:3000",
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

