import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Groypers Alpha Squadron — 777 $GROYPERS Recruits",
  description: "A hand-drawn collection of 777 meme recruits created to expand the recognition and visual identity of $GROYPERS.",
  openGraph: {
    title: "Groypers Alpha Squadron — 777 $GROYPERS Recruits",
    description: "The signal. The squadron. The amplifier.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Groypers Alpha Squadron" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Groypers Alpha Squadron — 777 $GROYPERS Recruits",
    description: "The signal. The squadron. The amplifier.",
    images: ["/og.png"],
  },
  icons: { icon: "/logo.png", shortcut: "/logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

