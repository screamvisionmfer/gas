export const siteConfig = {
  name: "Groypers Alpha Squadron",
  abbreviation: "GAS",
  token: "$GROYPER",
  supply: 777,
  network: "Solana",
  contractAddress: "44eFuquSFU8aC6Nn3LWmNapFn8f5WzwxrYEnJXjspump",
  collectionAddress: "DS54gL9wUofvjd9V7iVmMWk1Pwx2vf4G4mW1Kci6t239",
  twitterUrl: "https://x.com/GroyperPump",
  discordUrl: "",
  launchMyNftUrl: "https://launchmynft.io/collections/2Fbg8k4Cz1vfTCSBVKG15sFzRh6yLroJuH3zpM4FqLPo/klGgAOjY2RrRiZ08VBBa",
  knowYourMemeUrl: "https://knowyourmeme.com/memes/groyper",
  tokenUrl: "https://swap.pump.fun/?input=So11111111111111111111111111111111111111112&output=44eFuquSFU8aC6Nn3LWmNapFn8f5WzwxrYEnJXjspump",
  tokenWebsiteUrl: "https://groyperpump.fun/",
  creatorName: "Screamvision",
  creatorTwitterUrl: "https://x.com/scream_vision",
  siteUrl: "https://groypersquadron.xyz",
  canonicalUrl: "https://www.groypersquadron.xyz",
  roadmap: [
    { phase: "01", title: "ESTABLISH THE UNIT", status: "COMPLETED", state: "complete" },
    { phase: "02", title: "DEPLOY THE SQUADRON", status: "COMPLETED", state: "complete" },
    { phase: "03", title: "COMPLETE THE FIRST OPERATION", status: "AWAITING FULL DEPLOYMENT", state: "pending" },
    { phase: "04", title: "THE 4,444 EXPANSION", status: "LOCKED UNTIL ALL 777 ARE SOLD", state: "locked" },
  ],
} as const;

export function safeExternalUrl(value: string) {
  return /^https?:\/\//.test(value) ? value : "#";
}
