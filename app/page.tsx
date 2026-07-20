import { LandingPage } from "@/components/LandingPage";
import { getFeaturedRecruits } from "@/lib/nft-metadata";

export default function Home() {
  return <LandingPage recruits={getFeaturedRecruits()} />;
}
