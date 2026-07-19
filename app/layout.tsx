import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.canonicalUrl),
  title: "Groypers Alpha Squadron — 777 $GROYPER Recruits",
  description: "A hand-drawn collection of 777 meme recruits created to expand the recognition and visual identity of $GROYPER.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    siteName: "Groypers Alpha Squadron",
    title: "Groypers Alpha Squadron — 777 $GROYPER Recruits",
    description: "The signal. The squadron. The amplifier.",
    images: [{ url: "/social-preview.png", width: 1774, height: 887, alt: "Groypers Alpha Squadron" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@GroyperPump",
    creator: "@scream_vision",
    title: "Groypers Alpha Squadron — 777 $GROYPER Recruits",
    description: "The signal. The squadron. The amplifier.",
    images: [{ url: "/social-preview.png", width: 1774, height: 887, alt: "Groypers Alpha Squadron" }],
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "128x128" }],
    shortcut: "/favicon.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
