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

Edit `lib/site-config.ts` to update the project links, token contract, supply, deployed statistics, roadmap statuses, creator name, and fallback site URL. Repeated project values are centralized there.

Copy `.env.example` to `.env.local` and fill in server-only values:

```env
NFT_API_KEY=
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

The repository currently uses a deterministic mock result because the existing Bobros Cartel endpoint and response schema were not supplied. Replace only the documented TODO block with the real request, filter NFTs by `COLLECTION_ADDRESS`, map them to `OwnedNft[]`, and keep the route response shape unchanged.

## Share cards

`app/api/share-card/route.tsx` creates the default social preview and a wallet-specific `ImageResponse` when passed `wallet`, `count`, `rank`, and `unit` query parameters.

## GitHub and Vercel

1. Commit the repository and push it to GitHub.
2. Import the repository in Vercel.
3. Add `NFT_API_KEY`, `COLLECTION_ADDRESS`, and `NEXT_PUBLIC_SITE_URL` in project environment settings.
4. Deploy. The default build command is `npm run build`.

The default `dev`, `build`, and `start` scripts use Next.js for Vercel. The parallel `dev:sites`, `build:sites`, and `start:sites` scripts preserve the Sites-compatible Vite/vinext deployment path and `.openai/hosting.json`.
