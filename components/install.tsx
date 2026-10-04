"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { tap } from "@/lib/speech";
import { useI18n } from "./providers";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// The browser offers installation once, early. Keep hold of the offer until a screen wants it.
let saved: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    saved = event as InstallEvent;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    saved = null;
    listeners.forEach((fn) => fn());
  });
}

export type Platform = "ios" | "android" | "desktop";

export function detectPlatform(userAgent: string, touchPoints = 0): Platform {
  if (/iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && touchPoints > 1)) return "ios";
  if (/android/i.test(userAgent)) return "android";
  return "desktop";
}

export function useInstall() {
  const [, bump] = useState(0);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    const refresh = () => bump((count) => count + 1);
    listeners.add(refresh);
    setPlatform(detectPlatform(navigator.userAgent, navigator.maxTouchPoints));
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    return () => {
      listeners.delete(refresh);
    };
  }, []);

  async function prompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!saved) return "unavailable";
    const event = saved;
    await event.prompt();
    const choice = await event.userChoice;
    saved = null;
    bump((count) => count + 1);
    if (choice.outcome === "accepted") setInstalled(true);
    return choice.outcome;
  }

  return { installed, platform, canPrompt: Boolean(saved), prompt };
}

/** "Install Saath": one button where the browser allows it, and plain steps where it does not. */
export function InstallPanel() {
  const { t } = useI18n();
  const { installed, platform, canPrompt, prompt } = useInstall();
  const [declined, setDeclined] = useState(false);

  if (installed) return <p className="note ok">{t("install.done")}</p>;

  return (
    <div className="stack-sm">
      <p className="muted">{t("install.why")}</p>
      {canPrompt ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            tap();
            const result = await prompt();
            setDeclined(result === "dismissed");
          }}
        >
          <Download aria-hidden size={18} />
          {t("install.cta")}
        </button>
      ) : (
        <ol className="howto">
          {platform === "ios" && (
            <>
              <li><span>{t("install.ios1")} <Share aria-hidden size={16} style={{ verticalAlign: "-2px" }} /></span></li>
              <li><span>{t("install.ios2")} <SquarePlus aria-hidden size={16} style={{ verticalAlign: "-2px" }} /></span></li>
              <li><span>{t("install.ios3")}</span></li>
            </>
          )}
          {platform === "android" && (
            <>
              <li><span>{t("install.android1")}</span></li>
              <li><span>{t("install.android2")}</span></li>
              <li><span>{t("install.android3")}</span></li>
            </>
          )}
          {platform === "desktop" && (
            <>
              <li><span>{t("install.desktop1")}</span></li>
              <li><span>{t("install.desktop2")}</span></li>
            </>
          )}
        </ol>
      )}
      {declined && <p className="note">{t("install.later")}</p>}
      <p className="faint">{t("install.note")}</p>
    </div>
  );
}

/**
 * A quiet card on Home while Saath is still running in the browser. Where the browser allows it, one tap installs
 * Saath; on an iPhone, which has no install button, it says where to tap. It disappears once installed or dismissed.
 */
export function InstallCard() {
  const { t } = useI18n();
  const { installed, platform, canPrompt, prompt } = useInstall();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem("saath-install-card") === "hidden");
    } catch {
      // Shown for this visit.
    }
  }, []);
  if (installed || hidden || (!canPrompt && platform !== "ios")) return null;
  const close = () => {
    setHidden(true);
    try {
      window.localStorage.setItem("saath-install-card", "hidden");
    } catch {
      // Hidden for this visit.
    }
  };
  return (
    <section className="install-card" aria-label={t("install.title")}>
      <div className="stack-xs">
        <strong>{t("install.title")}</strong>
        <span className="faint">{canPrompt ? t("install.why") : `${t("install.ios1")} ${t("install.ios2")}`}</span>
      </div>
      <div className="install-card-actions">
        {canPrompt && (
          <button type="button" className="btn btn-primary btn-auto" onClick={async () => { tap(); const result = await prompt(); if (result === "accepted") close(); }}>
            <Download aria-hidden size={16} />{t("install.cta")}
          </button>
        )}
        <button type="button" className="link" onClick={() => { tap(); close(); }}>{t("install.notNow")}</button>
      </div>
    </section>
  );
}
