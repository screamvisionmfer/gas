import type { Metadata } from "next";
import { MaterialsPage } from "@/components/MaterialsPage";

export const metadata: Metadata = {
  title: "Squadron Materials — Groypers Alpha Squadron",
  description: "Unlock official GAS X banners with your on-chain squadron rank, special recruits and $GROYPER balance.",
  alternates: { canonical: "/materials" },
  openGraph: {
    url: "/materials",
    title: "Squadron Materials — Groypers Alpha Squadron",
    description: "Rank-gated official X banners for the Groypers Alpha Squadron.",
  },
};

export default function MaterialsRoute() {
  return <MaterialsPage />;
}

