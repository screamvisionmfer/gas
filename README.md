# Groypers Alpha Squadron

Production-ready Next.js App Router site for the 777-piece Groypers Alpha Squadron NFT collection. It includes a responsive recruitment-poster landing page, lightweight selected-recruit showcase, cinematic rank reveal, server-side wallet verification adapter, and dynamic share card route.

## Local setup

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local address printed by the development server. Before deployment, run:

```bash
npm run lint
npm run build
```

## Site configuration

Edit `lib/site-config.ts` to update project links, token and collection addresses, roadmap statuses, site URL, and X-banner dimensions/labels. Repeated project values are centralized there.

Team-allocation or treasury wallets that should not compete for `LARGEST KNOWN ARMY` belong in `siteConfig.statistics.largestArmyExcludedWallets`. They remain included in the total deployed supply and commander count; only the public maximum holding is filtered.

The hero logo and `DEPLOYED` statistic use LaunchMyNFT's official `totalMints / maxSupply` values, including team allocation. Hover, keyboard focus, or a tap reveals the sold total, percentage, and team-allocation breakdown. Helius remains the ownership source for commanders and largest-army calculations. The logo and statistics bar share one API request.

Copy `.env.example` to `.env.local` and fill in server-only values:

```env
HELIUS_API_KEY=
COLLECTION_ADDRESS=
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

Never prefix the NFT API key with `NEXT_PUBLIC_`; the verification route is intentionally server-side.

## NFT images and metadata

Place optimized PNG, JPG, AVIF, or WebP assets in `public/nfts/images/`. Add matching JSON records to `public/nfts/metadata/` using this shape:

```json
{
  "name": "GAS Recruit #001",
  "codename": "Desert Operator",
  "description": "Groypers Alpha Squadron recruit.",
  "image": "/nfts/images/1.png",
  "attributes": [
    { "trait_type": "Classification", "value": "Desert" }
  ]
}
```

Import 30–40 selected records in `lib/nft-metadata.ts`. The landing page renders a lightweight horizontal showcase only; there is no full 777-item database route and no reason to ship every artwork.

## Rank artwork

The 12 editable rank thresholds and image paths live in `lib/ranks.ts`; Supreme Commander starts at 77 recruits. Original rank PNGs are stored in `public/ranks/`, while the cropped, web-ready versions used by the reveal live in `public/ranks/web/`. Keep both numbered filename sets when replacing artwork.

## Wallet verification API

`app/api/verify-squadron/route.ts` accepts a Solana wallet and returns the typed `SquadronResult`. All external API work belongs in `lib/nft-verification.ts` so keys remain off the client.

The server uses Helius DAS on Solana mainnet and filters assets by `COLLECTION_ADDRESS`. `HELIUS_API_KEY` remains server-only. The verification result includes up to five preview assets plus a separately selected `bestRecruit` calculated across every matching NFT in the wallet.

## X banner generator

After a successful wallet scan, **Generate X Banner** opens a responsive preview and downloads an exact 1500 × 500 server-rendered PNG. The browser sends only the wallet and selected visual style; `app/api/twitter-banner/route.tsx` re-checks the wallet through Helius before every render and does not trust rank, count, unit, NFT name, or image data from the client.

Best-recruit selection is deterministic and uses this order:

1. highest on-chain `rarity_score` / `rarityScore`, when supplied by collection metadata;
2. lowest positive on-chain `Rarity Rank` attribute;
3. highest project-defined trait weight from `lib/banner-config.ts`;
4. first verified collection NFT as a safe fallback.

No external rarity is invented. Edit `traitWeights` in `lib/banner-config.ts` to change the project fallback. The same file contains the clean and tactical palettes; add a new style there, extend the `BannerStyle` type and its validation, then add its visual branch in the banner route. Dimensions, website label, tagline, and default style live in `siteConfig.banner`.

NFT image URLs are normalized in `lib/banner-images.ts`. IPFS links are converted to the public IPFS gateway, only HTTPS hosts in the explicit allowlist are accepted, and missing/invalid images fall back to `public/logo.png`. Rank art and the logo are read from local files during rendering.

Local API example (requires `.env.local`):

```text
http://localhost:3000/api/twitter-banner?wallet=YOUR_SOLANA_WALLET&style=clean
```

The response is a real PNG produced by the server-side `sharp` renderer with the bundled Top Secret C and Operation Napalm fonts. The renderer converts text to font-derived SVG paths, decodes and resizes the verified logo/rank/recruit images, then composites every layer into the final PNG. It does not use DOM screenshots, Puppeteer, or Playwright.

## Share cards

`app/api/share-card/route.tsx` creates the default social preview and a wallet-specific `ImageResponse` when passed `wallet`, `count`, `rank`, and `unit` query parameters.

## Commander HQ

`/commander-hq` currently uses the temporary shared access code `1337` before the Privy identity flow. The signed session still requires `COMMANDER_HQ_SESSION_SECRET` in Vercel and local environments. X authentication and a linked external Solana wallet continue protecting identity-specific Commander actions.

The profile, treasury, provisions, market, medals, and achievements provider is intentionally isolated in `lib/commander-hq-provider.ts` and still returns clearly labelled simulation data. Commander HQ Army data is live: its read-only wallet connection calls the existing `/api/verify-squadron` route, which keeps the Helius key server-side, filters the configured GAS collection, and applies the shared rank thresholds. No signing request, Privy account, or embedded wallet is used.

### Commander Payroll Devnet test

The Payroll transaction flow is an isolated UX test. Mainnet GAS NFTs continue to come from the existing Helius scan, while the only blockchain write is a user-approved transfer of a separate TEST $GAS SPL token on Solana Devnet. This is not the final payroll security model and does not prove production NFT eligibility.

Configure `NEXT_PUBLIC_GAS_TEST_MODE=true`, a Devnet-only RPC in `NEXT_PUBLIC_GAS_TEST_RPC_URL`, the Devnet SPL mint in `NEXT_PUBLIC_GAS_TEST_TOKEN_MINT`, and the Devnet wallet that owns the War Chest ATA in `NEXT_PUBLIC_GAS_TEST_WAR_CHEST`. The client verifies the RPC genesis hash is Devnet before building or submitting a transaction.

To create test assets with the Solana CLI, explicitly select Devnet, fund the local CLI wallet with Devnet SOL, then use the SPL Token CLI. These commands never expose or commit a private key:

```bash
solana config set --url devnet
solana airdrop 2
spl-token create-token
spl-token create-account TEST_MINT_ADDRESS
spl-token mint TEST_MINT_ADDRESS 1000000
```

Use any Devnet wallet address you control as `NEXT_PUBLIC_GAS_TEST_WAR_CHEST`. Its associated token account is created idempotently by the payer during the first confirmed test deployment. Never run these setup commands with a mainnet RPC.

## GitHub and Vercel

1. Commit the repository and push it to GitHub.
2. Import the repository in Vercel.
3. Add the API, collection, site URL, Privy, and database variables from `.env.example` in project environment settings.
4. Deploy. The default build command is `npm run build`.

The default `dev`, `build`, and `start` scripts use Next.js for Vercel. The parallel `dev:sites`, `build:sites`, and `start:sites` scripts preserve the Sites-compatible Vite/vinext deployment path and `.openai/hosting.json`.
