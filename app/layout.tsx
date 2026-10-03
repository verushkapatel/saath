import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3, Noto_Sans_Devanagari, Noto_Sans_Kannada } from "next/font/google";
import { Providers } from "@/components/providers";
import { RegisterSW, Shell } from "@/components/shell";
import { asset } from "@/lib/config";
import "./globals.css";
import "./leo.css";
import "./simulations.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700", "800"],
});
const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
const dev = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-dev",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
const kan = Noto_Sans_Kannada({
  subsets: ["kannada"],
  variable: "--font-kan",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Saath",
  description: "Saath reads loan and scheme papers in plain language, and includes Money Lab for students.",
  applicationName: "Saath",
  manifest: asset("/manifest.webmanifest"),
  appleWebApp: { capable: true, title: "Saath", statusBarStyle: "default" },
  icons: { icon: asset("/icon-192.png"), apple: asset("/icon-192.png") },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F1E4" },
    { media: "(prefers-color-scheme: dark)", color: "#011B3D" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${dev.variable} ${kan.variable}`}>
      <body>
        <Providers>
          <Shell>{children}</Shell>
          <RegisterSW />
        </Providers>
      </body>
    </html>
  );
}
