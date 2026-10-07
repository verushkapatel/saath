"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Check, FileText, Home, MessageCircle, Route, Settings, Wallet } from "lucide-react";
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
import { Landing as ProductLanding } from "./landing";
import { Splash } from "./splash";
import { Logo, LogoMark, SkywardEmblem } from "./logo";
import { Personalize } from "./personalize";
import { PrefsProvider, usePrefs } from "./prefs";
import { useI18n } from "./providers";
import { RewardSheet } from "./reward-sheet";
import { Celebrate } from "./celebrate";
import { SelectAsk } from "./select-ask";
import { SessionCtx } from "./session";
import { ThemeToggle } from "./theme-toggle";
import { InstallStep, MakeYours } from "./welcome";
import { ActivityHeartbeat } from "./activity-heartbeat";
import { Footer, PageSkeleton } from "./ui";

type Nav = { href: string; key: string; icon: typeof Home; match: (path: string) => boolean };

const TABS: Nav[] = [
  { href: "/", key: "nav.home", icon: Home, match: (path) => path === "/" || /^\/(stories|privacy|about)/.test(path) },
  { href: "/journey", key: "nav.journey", icon: Route, match: (path) => /^\/(journey|progress)/.test(path) },
  { href: "/guide", key: "nav.guide", icon: BookOpen, match: (path) => /^\/(guide|paths|drills|handbook|check)/.test(path) },
  { href: "/money-lab", key: "nav.money", icon: Wallet, match: (path) => path.startsWith("/money-lab") },
  { href: "/forms", key: "nav.forms", icon: FileText, match: (path) => /^\/(forms|scan)/.test(path) },
];
const MORE: Nav[] = [
  { href: "/settings", key: "nav.settings", icon: Settings, match: (path) => path.startsWith("/settings") },
];

const PREFILL = "saath-school-prefill";
type GateCopy = Record<Lang, { hello: string; name: string; title: string; cta: string; line: string }>;

/** The first screen: choose a language. The page does not move as the choice changes. */
function Landing({ onDone }: { onDone?: () => void } = {}) {
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
    <main className="landing screen navy-scene">
      <div className="landing-top"><ThemeToggle /></div>
      <div className="landing-body scene-in">
        <div className="landing-figure stage">
          <Character look={{ outfit: "kurta", extra: "none", place: "room" }} age={22} size={168} />
        </div>
        <div className="gate-heading">
          <p className="wordmark"><LogoMark size={40} /> Saath <span className="logo-divider" aria-hidden /><SkywardEmblem size={44} /></p>
          <h1 lang={shown}>{copy[shown].title}</h1>
          <p className="lead" lang={shown}>{copy[shown].line}</p>
        </div>
        <div className="gate-list" role="radiogroup" aria-label={copy[shown].title}>
          {LANGS.map((lang) => (
            <button key={lang} type="button" role="radio" lang={lang} aria-checked={pick === lang} onClick={() => { tap(); setPick(lang); }} data-testid={`language-option-${lang}`}>
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
        <button type="button" className="btn btn-primary" lang={shown} disabled={!pick} onClick={() => { if (pick) { tap(); setLang(pick); onDone?.(); window.scrollTo({ top: 0 }); } }} data-testid="language-continue-button">
          {copy[shown].cta}
        </button>
      </div>
    </main>
  );
}

const WITH_FOOTER = ["/", "/privacy", "/privacy/partners", "/about", "/handbook", "/settings"];

/**
 * Cards rise gently into place the first time they scroll into view, on every screen. Anything already on screen
 * when the page opens is shown at once, so nothing waits for a scroll.
 */
function ScrollReveal({ path }: { path: string }) {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("rv-in");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    const timer = window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>("#content .card:not(.rv), #content .list > li:not(.rv)").forEach((node) => {
        const box = node.getBoundingClientRect();
        if (box.top < window.innerHeight) return;
        node.classList.add("rv");
        observer.observe(node);
      });
    }, 60);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [path]);
  return null;
}

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
          <Logo size={30} />
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
          <Logo size={30} />
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
        <ScrollReveal path={pathname} />
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
      {prefs.ai && <SelectAsk />}
      {app.celebration ? <Celebrate /> : !inEpisode && app.fresh.length > 0 && <RewardSheet />}
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
  const [view, setView] = useState<"intro" | "yours" | "install" | AuthMode>("intro");
  // After the logo opening, every new visit is asked its language first, even if one was saved before.
  const [langAsked, setLangAsked] = useState(true);
  useEffect(() => {
    try { setLangAsked(window.sessionStorage.getItem("saath-lang-asked") === "1"); } catch { setLangAsked(false); }
  }, []);
  const langDone = () => {
    try { window.sessionStorage.setItem("saath-lang-asked", "1"); } catch { /* Storage blocked: ask again next time. */ }
    setLangAsked(true);
  };
  const [printing, setPrinting] = useState(false);

  const clean = pathname.replace(/\/$/, "") || "/";
  // Partner pages and the print view need no login. Privacy and About can be read before signing up.
  const partner = /^\/(impact|link)/.test(clean);
  const open = /^\/(privacy|about|admin)/.test(clean);

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
    // Opened from the home screen: the immersion was seen in the browser, so go straight to making the account.
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!saved && hasAccounts()) setView("login");
    else if (!saved && standalone) setView("signup");
    setBooted(true);
  }, [enter]);

  useEffect(() => {
    if (ready && !lang && (partner || printing)) setLang("en", false);
  }, [ready, lang, partner, printing, setLang]);

  const go = useCallback((next: "intro" | "yours" | "install" | AuthMode) => {
    setView(next);
    window.scrollTo({ top: 0 });
  }, []);

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
  if (!lang) return partner || printing ? <main className="page bare" /> : <div className="no-rail"><Splash /><Landing onDone={langDone} /></div>;
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
        {view === "intro" && <Splash />}
        {view === "intro" && !langAsked ? (
          <Landing onDone={langDone} />
        ) : view === "intro" ? (
          <ProductLanding onJoin={() => go("yours")} onLogin={() => go("login")} />
        ) : view === "yours" ? (
          <MakeYours onNext={() => go("install")} onLogin={() => go("login")} onBack={() => go("intro")} />
        ) : view === "install" ? (
          <InstallStep onNext={() => go("signup")} onBack={() => go("yours")} />
        ) : (
          <AuthScreen
            key={view}
            initial={view}
            onBack={() => go(view === "signup" ? "install" : "intro")}
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
          <ActivityHeartbeat />
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
    // When a new version of Saath takes over, reload once so the page matches it.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      window.location.reload();
    });
    navigator.serviceWorker.register(asset("/sw.js"), { scope: asset("/") }).then((reg) => reg.update()).catch(() => undefined);
  }, []);
  return null;
}
