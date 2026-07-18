import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Groypers Alpha Squadron — 777 $GROYPER Recruits",
  description: "A hand-drawn collection of 777 meme recruits created to expand the recognition and visual identity of $GROYPER.",
  openGraph: {
    title: "Groypers Alpha Squadron — 777 $GROYPER Recruits",
    description: "The signal. The squadron. The amplifier.",
    images: [{ url: "/logo.png", width: 1536, height: 1536, alt: "Groypers Alpha Squadron" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Groypers Alpha Squadron — 777 $GROYPER Recruits",
    description: "The signal. The squadron. The amplifier.",
    images: ["/logo.png"],
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
