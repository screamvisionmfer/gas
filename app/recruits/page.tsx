import type { Metadata } from "next";
import { RecruitExplorer } from "@/components/RecruitExplorer";
import { getAllRecruits } from "@/lib/nft-metadata";

export const metadata: Metadata = {
  title: "Recruit Database — Groypers Alpha Squadron",
  description: "Search the local archive of Groypers Alpha Squadron NFT recruits.",
};

export default function RecruitsPage() {
  return <RecruitExplorer recruits={getAllRecruits()} />;
}

