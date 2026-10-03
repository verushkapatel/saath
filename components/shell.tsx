"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Home, ScanLine, Wallet } from "lucide-react";
import { currentAccount, logOut, type Account } from "@/lib/account";
import { asset } from "@/lib/config";
import { LANGS, type Lang } from "@/lib/catalog";
import { loadJson } from "@/lib/content-types";
import { checkPin, clearPin, hasPin } from "@/lib/pin";
import { eraseDevice, openDatabase } from "@/lib/storage";
import { tap } from "@/lib/speech";
import { AppStateProvider, useApp } from "./app-state";
import { ArtFirst } from "./illustrations";
import { Welcome } from "./intro";
import { NumPad } from "./numpad";
import { ProfileSheet, type ProfileView } from "./profile-sheet";
import { useI18n } from "./providers";
import { SessionCtx, useSession } from "./session";
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

function PinLock({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  const [digits, setDigits] = useState("");
  const [wrong, setWrong] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);

  async function addDigit(digit: string) {
    const next = (digits + digit).slice(0, 4);
    setDigits(next);
    setWrong(false);
    if (next.length < 4) return;
    if (await checkPin(next)) onOpen();
    else {
      setDigits("");
      setWrong(true);
    }
  }

  return (
    <main className="page bare gate screen">
      <div className="stack-lg">
        <div className="stack-sm center">
          <p className="brand-name">Saath</p>
          <h1>{t("pin.title")}</h1>
        </div>
        <div className="pin-dots" role="status" aria-label={t("pin.dots", { count: digits.length })}>
          {[0, 1, 2, 3].map((index) => (
            <i key={index} className={index < digits.length ? "on" : undefined} />
          ))}
        </div>
        {wrong && <p role="alert" className="note err center">{t("pin.wrong")}</p>}
        <NumPad onDigit={(digit) => void addDigit(digit)} onDelete={() => setDigits((value) => value.slice(0, -1))} deleteLabel={t("pin.delete")} />
        {confirmErase ? (
          <div className="stack-sm">
            <p className="note">{t("pin.forgotBody")}</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                tap();
                await eraseDevice();
                clearPin();
                logOut();
                window.location.reload();
              }}
            >
              {t("pin.erase")}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmErase(true)}>
            {t("pin.forgot")}
          </button>
        )}
      </div>
    </main>
  );
}

function AppFrame({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { account } = useSession();
  const { sync } = useApp();
  const pathname = usePathname();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const openProfile = useCallback((view: ProfileView = "main") => setProfile(view), []);

  useEffect(() => {
    if (sync.status === "needs-secret") setProfile((current) => current ?? "secret");
  }, [sync.status]);

  const name = account.name;

  return (
    <div className="with-rail">
      <a className="skip" href="#content">{t("common.skip")}</a>
      <header className="shell-top">
        <Link href="/" className="brand" aria-label="Saath">
          <SkywardMark />
          <span className="brand-name">Saath</span>
        </Link>
        <button
          type="button"
          className="profile-btn"
          aria-label={`${name}. ${t("profile.open")}`}
          title={name}
          onClick={() => {
            tap();
            openProfile();
          }}
        >
          <strong aria-hidden>{name.charAt(0).toUpperCase()}</strong>
        </button>
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
      {profile && <ProfileSheet initial={profile} onClose={() => setProfile(null)} />}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { lang, ready, copyReady } = useI18n();
  const [pinLocked, setPinLocked] = useState<boolean | null>(null);
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    setPinLocked(hasPin());
    const active = currentAccount();
    if (active) openDatabase(active.db);
    setAccount(active);
  }, []);

  const session = useMemo(
    () =>
      account
        ? {
            account,
            logOut: () => {
              logOut();
              setAccount(null);
              window.scrollTo({ top: 0 });
            },
          }
        : null,
    [account],
  );

  if (!ready || pinLocked === null) return <main className="page bare" />;
  if (!lang) return <div className="no-rail"><LanguageGate /></div>;
  if (!copyReady) return <main className="page bare"><PageSkeleton /></main>;
  if (pinLocked) return <div className="no-rail"><PinLock onOpen={() => setPinLocked(false)} /></div>;
  if (!account || !session) {
    return (
      <div className="no-rail">
        <Welcome
          onAccount={(next) => {
            openDatabase(next.db);
            setAccount(next);
            window.scrollTo({ top: 0 });
          }}
        />
      </div>
    );
  }

  return (
    <SessionCtx.Provider value={session}>
      <AppStateProvider key={account.id}>
        <AppFrame>{children}</AppFrame>
      </AppStateProvider>
    </SessionCtx.Provider>
  );
}

export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(asset("/sw.js"), { scope: asset("/") }).catch(() => undefined);
  }, []);
  return null;
}
