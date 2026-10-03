"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Check, FileText, Home, LineChart, MessageCircle, Route, Settings, Wallet } from "lucide-react";
import { currentAccount, hasAccounts, logOut, type Account } from "@/lib/account";
import { asset } from "@/lib/config";
import { LANGS, type Lang } from "@/lib/catalog";
import { loadJson } from "@/lib/content-types";
import { cleanCode, ensureProfile, type Profile } from "@/lib/profile";
import { setScope } from "@/lib/scope";
import { openDatabase } from "@/lib/storage";
import { tap } from "@/lib/speech";
import { AiContextProvider, useAi } from "./ai-context";
import { AskSheet } from "./ai-screens";
import { AppStateProvider, useApp } from "./app-state";
import { AuthScreen, type AuthMode } from "./auth";
import { Character } from "./character";
import { Intro } from "./intro";
import { Logo, LogoMark } from "./logo";
import { Personalize } from "./personalize";
import { PrefsProvider, usePrefs } from "./prefs";
import { useI18n } from "./providers";
import { RewardSheet } from "./reward-sheet";
import { SessionCtx } from "./session";
import { ThemeToggle } from "./theme-toggle";
import { Footer, PageSkeleton } from "./ui";

type Nav = { href: string; key: string; icon: typeof Home; match: (path: string) => boolean };

const TABS: Nav[] = [
  { href: "/", key: "nav.home", icon: Home, match: (path) => path === "/" || /^\/(stories|privacy|about)/.test(path) },
  { href: "/journey", key: "nav.journey", icon: Route, match: (path) => path.startsWith("/journey") },
  { href: "/guide", key: "nav.guide", icon: BookOpen, match: (path) => /^\/(guide|paths|drills|handbook|comic|check)/.test(path) },
  { href: "/money-lab", key: "nav.money", icon: Wallet, match: (path) => path.startsWith("/money-lab") },
  { href: "/forms", key: "nav.forms", icon: FileText, match: (path) => /^\/(forms|scan)/.test(path) },
];
const MORE: Nav[] = [
  { href: "/ai", key: "nav.ai", icon: MessageCircle, match: (path) => path.startsWith("/ai") },
  { href: "/progress", key: "nav.progress", icon: LineChart, match: (path) => path.startsWith("/progress") },
  { href: "/settings", key: "nav.settings", icon: Settings, match: (path) => path.startsWith("/settings") },
];

const PREFILL = "saath-school-prefill";
type GateCopy = Record<Lang, { hello: string; name: string; title: string; cta: string; line: string }>;

/** The first screen: choose a language. The page does not move as the choice changes. */
function Landing() {
  const { setLang } = useI18n();
  const [copy, setCopy] = useState<GateCopy | null>(null);
  const [pick, setPick] = useState<Lang | null>(null);

  useEffect(() => {
    // Coming back to change language: start with the one already in use.
    try {
      const saved = window.localStorage.getItem("saath-lang");
      if (saved && LANGS.includes(saved as Lang)) setPick(saved as Lang);
    } catch {
      // Nothing saved yet.
    }
    loadJson<GateCopy>("/locales/gate.json").then(setCopy).catch(() => undefined);
  }, []);

  if (!copy) return <main className="page bare"><PageSkeleton /></main>;
  const shown = pick ?? "en";

  return (
    <main className="landing screen">
      <div className="landing-top"><ThemeToggle /></div>
      <div className="landing-body">
        <div className="landing-figure stage">
          <Character look={{ outfit: "kurta", extra: "none", place: "room" }} age={22} size={168} />
        </div>
        <div className="gate-heading">
          <p className="wordmark"><LogoMark size={40} /> Saath</p>
          <h1 lang={shown}>{copy[shown].title}</h1>
          <p className="lead" lang={shown}>{copy[shown].line}</p>
        </div>
        <div className="gate-list" role="radiogroup" aria-label={copy[shown].title}>
          {LANGS.map((lang) => (
            <button key={lang} type="button" role="radio" lang={lang} aria-checked={pick === lang} onClick={() => { tap(); setPick(lang); }}>
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
        <button type="button" className="btn btn-primary" lang={shown} disabled={!pick} onClick={() => { if (pick) { tap(); setLang(pick); window.scrollTo({ top: 0 }); } }}>
          {copy[shown].cta}
        </button>
      </div>
    </main>
  );
}

const WITH_FOOTER = ["/", "/privacy", "/privacy/partners", "/about", "/handbook", "/settings"];

function AppFrame({ children, account }: { children: React.ReactNode; account: Account }) {
  const { t } = useI18n();
  const app = useApp();
  const ai = useAi();
  const { prefs } = usePrefs();
  const pathname = usePathname();
  const clean = pathname.replace(/\/$/, "") || "/";
  const tabIndex = TABS.findIndex((tab) => tab.match(clean));
  const inEpisode = /^\/journey\/.+/.test(clean);

  if (app.ready && !app.progress.personalised) return <div className="no-rail"><Personalize name={account.display} /></div>;

  return (
    <div className="with-rail">
      <a className="skip" href="#content">{t("common.skip")}</a>
      <header className="shell-top">
        <Link href="/" className="brand" aria-label="Saath">
          <Logo size={26} />
        </Link>
        <span className="cluster">
          {prefs.ai && (
            <button type="button" className="ask-btn" onClick={() => { tap(); ai.openAsk(); }}>
              <MessageCircle aria-hidden size={18} />
              <span>{t("ai.ask")}</span>
            </button>
          )}
          <Link href="/progress" className="profile-btn" aria-label={`${account.display}. ${t("nav.progress")}`} title={account.display} onClick={tap}>
            <strong aria-hidden>{[...account.display][0]?.toUpperCase() ?? "S"}</strong>
          </Link>
        </span>
      </header>
      <nav className="rail" aria-label={t("nav.label")}>
        <Link href="/" className="brand" aria-label="Saath">
          <Logo size={26} />
        </Link>
        {[...TABS, ...MORE].map((tab, index) => {
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className={`nav${index === TABS.length ? " nav-gap" : ""}`} aria-current={tab.match(clean) ? "page" : undefined}>
              <Icon aria-hidden size={20} />
              {t(tab.key)}
            </Link>
          );
        })}
        <span className="rail-gap" />
        <p className="faint rail-note">{t("common.footer")}</p>
      </nav>
      <main id="content" className="page">
        <div key={pathname} className="screen">
          {children}
          {WITH_FOOTER.includes(clean) && <Footer />}
        </div>
      </main>
      <nav className="tabs" aria-label={t("nav.label")} style={{ ["--tab-count" as string]: TABS.length }}>
        {tabIndex >= 0 && <span className="tab-ind" aria-hidden style={{ transform: `translateX(${tabIndex * 100}%)` }} />}
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} aria-current={tab.match(clean) ? "page" : undefined} onClick={tap}>
              <Icon aria-hidden size={22} />
              <span>{t(tab.key)}</span>
            </Link>
          );
        })}
      </nav>
      {ai.askOpen && <AskSheet />}
      {!inEpisode && app.fresh.length > 0 && <RewardSheet />}
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const { lang, ready, copyReady, setLang } = useI18n();
  const { reload } = usePrefs();
  const pathname = usePathname();
  const router = useRouter();
  const [booted, setBooted] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<"intro" | AuthMode>("intro");
  const [printing, setPrinting] = useState(false);

  const clean = pathname.replace(/\/$/, "") || "/";
  // Partner pages and the print view need no login. Privacy and About can be read before signing up.
  const partner = /^\/(impact|link)/.test(clean);
  const open = /^\/(privacy|about)/.test(clean);

  const enter = useCallback((next: Account | null) => {
    setScope(next?.id ?? null);
    const active = ensureProfile(next ? { nickname: next.display, db: next.db } : undefined);
    openDatabase(active.db);
    setProfile(active);
    setAccount(next);
    reload();
    if (next) {
      try {
        const own = window.localStorage.getItem(`saath-lang:${next.id}`);
        if (own && LANGS.includes(own as Lang)) setLang(own as Lang);
      } catch {
        // The device language stays.
      }
    }
  }, [reload, setLang]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setPrinting(params.get("print") === "1");
      const school = params.get("school");
      if (school) window.sessionStorage.setItem(PREFILL, cleanCode(school));
    } catch {
      // No parameters.
    }
    const saved = currentAccount();
    enter(saved);
    if (!saved && hasAccounts()) setView("login");
    setBooted(true);
  }, [enter]);

  useEffect(() => {
    if (ready && !lang && (partner || printing)) setLang("en", false);
  }, [ready, lang, partner, printing, setLang]);

  const logout = useCallback(() => {
    logOut();
    enter(null);
    setView("login");
    router.push("/");
    window.scrollTo({ top: 0 });
  }, [enter, router]);

  const openProfile = useCallback(() => router.push("/settings"), [router]);
  const session = useMemo(
    () => (profile ? { profile, setProfile, openProfile, account, logout } : null),
    [profile, openProfile, account, logout],
  );

  if (!ready || !booted || !profile || !session) return <main className="page bare" />;
  if (!lang) return partner || printing ? <main className="page bare" /> : <div className="no-rail"><Landing /></div>;
  if (!copyReady) return <main className="page bare"><PageSkeleton /></main>;

  if (partner || printing || (!account && open)) {
    return (
      <SessionCtx.Provider value={session}>
        <AppStateProvider key={profile.db}>
          <AiContextProvider>
            <div className="no-rail">
              <main id="content" className={`page bare${printing ? " print-view" : ""}`}>
                {!account && open && <p><Link href="/" className="link">Saath</Link></p>}
                {children}
              </main>
            </div>
          </AiContextProvider>
        </AppStateProvider>
      </SessionCtx.Provider>
    );
  }

  if (!account) {
    return (
      <div className="no-rail">
        {view === "intro" ? (
          <Intro onJoin={() => { setView("signup"); window.scrollTo({ top: 0 }); }} onLogin={() => { setView("login"); window.scrollTo({ top: 0 }); }} />
        ) : (
          <AuthScreen
            key={view}
            initial={view}
            onBack={() => { setView("intro"); window.scrollTo({ top: 0 }); }}
            onDone={(next) => { enter(next); window.scrollTo({ top: 0 }); }}
          />
        )}
      </div>
    );
  }

  return (
    <SessionCtx.Provider value={session}>
      <AppStateProvider key={account.id}>
        <AiContextProvider>
          <AppFrame account={account}>{children}</AppFrame>
        </AiContextProvider>
      </AppStateProvider>
    </SessionCtx.Provider>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <PrefsProvider>
      <Frame>{children}</Frame>
    </PrefsProvider>
  );
}

export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(asset("/sw.js"), { scope: asset("/") }).catch(() => undefined);
  }, []);
  return null;
}
