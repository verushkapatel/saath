"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Check, Home, ScanLine, Wallet } from "lucide-react";
import { asset } from "@/lib/config";
import { LANGS, type Lang } from "@/lib/catalog";
import { loadJson } from "@/lib/content-types";
import { tap } from "@/lib/speech";
import { AppStateProvider } from "./app-state";
import { ArtFirst } from "./illustrations";
import { useI18n } from "./providers";
import { Footer, PageSkeleton, SkywardMark } from "./ui";

const TABS = [
  { href: "/", key: "nav.home", icon: Home, match: (path: string) => path === "/" || path.startsWith("/privacy") || path.startsWith("/about") || path.startsWith("/paths") },
  { href: "/scan", key: "nav.scan", icon: ScanLine, match: (path: string) => path.startsWith("/scan") },
  { href: "/money-lab", key: "nav.money", icon: Wallet, match: (path: string) => path.startsWith("/money-lab") },
  { href: "/guide", key: "nav.guide", icon: BookOpen, match: (path: string) => path.startsWith("/guide") },
];

type GateCopy = Record<Lang, { hello: string; name: string; title: string; cta: string }>;

function LanguageGate() {
  const { setLang } = useI18n();
  const [copy, setCopy] = useState<GateCopy | null>(null);
  const [pick, setPick] = useState<Lang | null>(null);

  useEffect(() => {
    loadJson<GateCopy>("/locales/gate.json").then(setCopy).catch(() => undefined);
  }, []);

  if (!copy) return <main className="page bare"><PageSkeleton /></main>;
  const shown = pick ?? "en";

  return (
    <main className="page bare gate screen">
      <div className="stack-lg">
        <ArtFirst label="" />
        <div className="stack-sm center">
          <p className="brand-name">Saath</p>
          <h1 lang={shown}>{copy[shown].title}</h1>
          {!pick && (
            <p className="lead">
              <span lang="hi">{copy.hi.title}</span>
              {" · "}
              <span lang="mr">{copy.mr.title}</span>
              {" · "}
              <span lang="kn">{copy.kn.title}</span>
            </p>
          )}
        </div>
        <div className="gate-list" role="radiogroup" aria-label={copy[shown].title}>
          {LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              role="radio"
              lang={lang}
              aria-checked={pick === lang}
              onClick={() => {
                tap();
                setPick(lang);
              }}
            >
              <span>
                <b>{copy[lang].name}</b>
                <span className="faint">{copy[lang].hello}</span>
              </span>
              <span className={`dot${pick === lang ? " done" : ""}`} aria-hidden>
                {pick === lang ? <Check size={16} strokeWidth={3} /> : null}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          lang={shown}
          disabled={!pick}
          onClick={() => {
            if (!pick) return;
            tap();
            setLang(pick);
          }}
        >
          {copy[shown].cta}
        </button>
      </div>
    </main>
  );
}

function AppFrame({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <div className="with-rail">
      <a className="skip" href="#content">{t("common.skip")}</a>
      <header className="shell-top">
        <Link href="/" className="brand" aria-label="Saath">
          <SkywardMark />
          <span className="brand-name">Saath</span>
        </Link>
      </header>
      <nav className="rail" aria-label={t("nav.label")}>
        <Link href="/" className="brand" aria-label="Saath">
          <SkywardMark />
          <span className="brand-name">Saath</span>
        </Link>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className="nav" aria-current={tab.match(pathname) ? "page" : undefined}>
              <Icon aria-hidden size={20} fill={tab.match(pathname) ? "currentColor" : "none"} fillOpacity={0.18} />
              {t(tab.key)}
            </Link>
          );
        })}
      </nav>
      <main id="content" className="page">
        <div key={pathname} className="screen">
          {children}
          {["/", "/money-lab", "/privacy", "/about"].includes(pathname.replace(/\/$/, "") || "/") && <Footer />}
        </div>
      </main>
      <nav className="tabs" aria-label={t("nav.label")}>
        <span className="tab-ind" aria-hidden style={{ transform: `translateX(${Math.max(0, TABS.findIndex((tab) => tab.match(pathname))) * 100}%)` }} />
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} aria-current={tab.match(pathname) ? "page" : undefined} onClick={tap}>
              <Icon aria-hidden size={22} fill={tab.match(pathname) ? "currentColor" : "none"} fillOpacity={0.18} />
              <span>{t(tab.key)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { lang, ready, copyReady } = useI18n();

  if (!ready) return <main className="page bare" />;
  if (!lang) return <div className="no-rail"><LanguageGate /></div>;
  if (!copyReady) return <main className="page bare"><PageSkeleton /></main>;

  return (
    <AppStateProvider>
      <AppFrame>{children}</AppFrame>
    </AppStateProvider>
  );
}

export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(asset("/sw.js"), { scope: asset("/") }).catch(() => undefined);
  }, []);
  return null;
}
