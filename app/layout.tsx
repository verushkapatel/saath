import type { Metadata, Viewport } from "next";
import { EB_Garamond, Noto_Sans_Devanagari } from "next/font/google";
import { Providers } from "@/components/providers";
import { RegisterSW, Shell } from "@/components/shell";
import { asset } from "@/lib/config";
import { PREFS_BOOT } from "@/lib/prefs";
import "./globals.css";
import "./simulations.css";

// One clean sans for everything, as on Apple platforms: Inter for Latin, Noto Sans Devanagari for Hindi and Marathi.
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
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
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
