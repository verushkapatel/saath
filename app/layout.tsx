import type { Metadata, Viewport } from "next";
import { EB_Garamond, Noto_Sans_Devanagari } from "next/font/google";
import { Providers } from "@/components/providers";
import { RegisterSW, Shell } from "@/components/shell";
import { asset } from "@/lib/config";
import { PREFS_BOOT } from "@/lib/prefs";
import "./globals.css";
import "./simulations.css";
import "./landing.css";

// One formal serif throughout: EB Garamond for Latin, Noto Sans Devanagari for Hindi and Marathi.
// They are downloaded at build time and served from this site, with size-matched fallbacks so text does not jump.
const sans = EB_Garamond({ subsets: ["latin"], variable: "--font-sans", display: "swap", weight: ["400", "500", "600", "700", "800"] });
const dev = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-dev", display: "swap", weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  title: "Saath · a companion for your financial life",
  description: "Live a financial life in a story, look anything up, read forms before you sign, and keep track of your own money. From The Skyward Project.",
  applicationName: "Saath",
  manifest: asset("/manifest.webmanifest"),
  appleWebApp: { capable: true, title: "Saath", statusBarStyle: "black-translucent" },
  icons: { icon: asset("/icon-192.png"), apple: asset("/icon-192.png") },
  // The card WhatsApp, iMessage, X and others show when a Saath link is shared.
  metadataBase: new URL("https://saath.cc"),
  openGraph: {
    type: "website",
    url: "https://saath.cc/",
    siteName: "Saath",
    title: "Saath · your companion for money",
    description: "Live Verena's money story from first salary to retirement, ask Saath AI anything, understand forms before you sign, and run your own Money Lab. Free, in English, Hindi and Marathi.",
    images: [{ url: "https://saath.cc/og.jpg", width: 1200, height: 630, type: "image/jpeg", alt: "Saath, your companion for money, by The Skyward Project" }],
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: "Saath · your companion for money", description: "Verena's money story, Saath AI, forms explained and your own Money Lab.", images: ["https://saath.cc/og.jpg"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000000" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${dev.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme and text size before anything is drawn, so there is no flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
      </head>
      <body>
        <Providers>
          <Shell>{children}</Shell>
          <RegisterSW />
        </Providers>
      </body>
    </html>
  );
}
