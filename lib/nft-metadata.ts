import one from "@/public/nfts/metadata/1.json";
import two from "@/public/nfts/metadata/2.json";
import three from "@/public/nfts/metadata/3.json";
import four from "@/public/nfts/metadata/4.json";
import five from "@/public/nfts/metadata/5.json";
import six from "@/public/nfts/metadata/6.json";
import seven from "@/public/nfts/metadata/7.json";
import eight from "@/public/nfts/metadata/8.json";
import nine from "@/public/nfts/metadata/9.json";
import ten from "@/public/nfts/metadata/10.json";
import eleven from "@/public/nfts/metadata/11.json";
import twelve from "@/public/nfts/metadata/12.json";
import type { NftMetadata } from "./types";

const metadata = [one, two, three, four, five, six, seven, eight, nine, ten, eleven, twelve] as NftMetadata[];

export function getFeaturedRecruits() {
  return Array.from({ length: 36 }, (_, index) => {
    const source = metadata[index % metadata.length];
    const number = String(index + 1).padStart(3, "0");
    return {
      ...source,
      name: `GAS Recruit #${number}`,
      codename: index < metadata.length ? source.codename : `${source.codename} ${Math.floor(index / metadata.length) + 1}`,
    };
  });
}

export function recruitNumber(name: string) {
  return name.match(/#(\d+)/)?.[1] ?? "000";
}
