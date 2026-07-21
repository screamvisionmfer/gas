export type Attribute = {
  trait_type: string;
  value: string | number;
  display_type?: string;
};

export type NftMetadata = {
  name: string;
  description: string;
  symbol?: string;
  image: string;
  attributes: Attribute[];
};

export type OwnedNft = {
  mint: string;
  name: string;
  image: string;
  attributes?: Attribute[];
  rarityScore?: number;
  rarityRank?: number;
};

export type Rank = {
  min: number;
  max?: number;
  name: string;
  unitName: string;
  image: string;
};

export type SquadronResult = {
  wallet: string;
  count: number;
  ownedNfts: OwnedNft[];
  bestRecruit?: OwnedNft | null;
  rank: Rank;
  unitName: string;
  nextRank?: Rank;
  recruitsUntilNextRank?: number;
};

export type SquadronStats = {
  deployed: number;
  teamAllocation: number;
  commanders: number;
  largestArmy: number;
  updatedAt: string;
};
