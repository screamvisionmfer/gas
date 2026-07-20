import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { NftMetadata } from "./types";

const metadataDirectory = join(process.cwd(), "public", "nfts", "metadata");

export function getFeaturedRecruits() {
  return readdirSync(metadataDirectory)
    .filter((file) => /^nft_\d+\.json$/i.test(file))
    .sort((left, right) => Number(left.match(/\d+/)?.[0]) - Number(right.match(/\d+/)?.[0]))
    .map((file) => {
      const source = JSON.parse(readFileSync(join(metadataDirectory, file), "utf8")) as NftMetadata;
      const localImage = basename(source.image.replaceAll("\\", "/"));
      return { ...source, image: `/nfts/images/${localImage}` };
    });
}
