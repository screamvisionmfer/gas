export type MaterialRequirement =
  | { type: "rank"; minNfts: number; rankName: string }
  | { type: "nft"; recruitNumber: number }
  | { type: "token"; minimumBalance: number };

export type MaterialDefinition = {
  id: string;
  title: string;
  subtitle: string;
  fileName: string;
  downloadName: string;
  requirement: MaterialRequirement;
};

export const materialsCatalog: MaterialDefinition[] = [
  {
    id: "banner-01-night-patrol",
    title: "PURPLE NIGHT PATROL",
    subtitle: "GAS X Banner 01",
    fileName: "GAS X BANNER 1.png",
    downloadName: "GAS-X-Banner-01-Night-Patrol.png",
    requirement: { type: "rank", minNfts: 1, rankName: "Recruit" },
  },
  {
    id: "banner-02-camouflage",
    title: "FIELD CAMOUFLAGE",
    subtitle: "GAS X Banner 02",
    fileName: "GAS X BANNER 2.png",
    downloadName: "GAS-X-Banner-02-Field-Camouflage.png",
    requirement: { type: "rank", minNfts: 2, rankName: "Initiate" },
  },
  {
    id: "banner-03-groyper-70",
    title: "GOLD CLEARANCE / GROYPER #70",
    subtitle: "One-of-one holder issue",
    fileName: "GAS X BANNER 3 (only for owner of GROYPER #70).png",
    downloadName: "GAS-X-Banner-Groyper-070.png",
    requirement: { type: "nft", recruitNumber: 70 },
  },
  {
    id: "banner-04-groyper-631",
    title: "ANATOMY OF COMMAND / GROYPER #631",
    subtitle: "One-of-one holder issue",
    fileName: "GAS X BANNER 4 (only for owner of GROYPER #631).png",
    downloadName: "GAS-X-Banner-Groyper-631.png",
    requirement: { type: "nft", recruitNumber: 631 },
  },
  {
    id: "banner-05-green-signal",
    title: "GREEN SIGNAL",
    subtitle: "GAS X Banner 05",
    fileName: "GAS X BANNER 5.png",
    downloadName: "GAS-X-Banner-05-Green-Signal.png",
    requirement: { type: "rank", minNfts: 3, rankName: "Prospect" },
  },
  {
    id: "banner-06-protocol-44",
    title: "PROTOCOL 44",
    subtitle: "GAS X Banner 06",
    fileName: "GAS X BANNER 6.png",
    downloadName: "GAS-X-Banner-06-Protocol-44.png",
    requirement: { type: "rank", minNfts: 5, rankName: "Operative" },
  },
  {
    id: "banner-07-millionaire-reserve",
    title: "CERTIFIED $GROYPER MILLIONAIRE / RESERVE",
    subtitle: "Token-holder issue",
    fileName: "GAS X BANNER 7 CERTIFIED MILLIONAIRE.png",
    downloadName: "GAS-X-Banner-Certified-Millionaire-Reserve.png",
    requirement: { type: "token", minimumBalance: 1_000_000 },
  },
  {
    id: "banner-08-millionaire-pink",
    title: "CERTIFIED $GROYPER MILLIONAIRE / PINK",
    subtitle: "Token-holder issue",
    fileName: "GAS X BANNER 8 CERTIFIED MILLIONAIRE.png",
    downloadName: "GAS-X-Banner-Certified-Millionaire-Pink.png",
    requirement: { type: "token", minimumBalance: 1_000_000 },
  },
  {
    id: "banner-09-groyper-201",
    title: "MONUMENT DETAIL / GROYPER #201",
    subtitle: "One-of-one holder issue",
    fileName: "GAS X BANNER 9 (only for owner of GROYPER #201).png",
    downloadName: "GAS-X-Banner-Groyper-201.png",
    requirement: { type: "nft", recruitNumber: 201 },
  },
  {
    id: "banner-10-groyper-283",
    title: "DARK CARNIVAL / GROYPER #283",
    subtitle: "One-of-one holder issue",
    fileName: "GAS X BANNER 9 (only for owner of GROYPER #283).png",
    downloadName: "GAS-X-Banner-Groyper-283.png",
    requirement: { type: "nft", recruitNumber: 283 },
  },
];

export function requirementLabel(requirement: MaterialRequirement) {
  if (requirement.type === "rank") return `${requirement.rankName.toUpperCase()} CLEARANCE · ${requirement.minNfts}+ NFT`;
  if (requirement.type === "nft") return `OWNER OF GROYPER #${requirement.recruitNumber}`;
  return `${requirement.minimumBalance.toLocaleString("en-US")}+ $GROYPER`;
}

