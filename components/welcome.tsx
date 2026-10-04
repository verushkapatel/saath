"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronLeft, Download, Laptop, MoreVertical, Share, Smartphone, SquarePlus, Star } from "lucide-react";
import { tap } from "@/lib/speech";
import { Character } from "./character";
import { useInstall, type Platform } from "./install";
import { LangSwitch } from "./lang-switch";
import { LogoMark, SkywardEmblem } from "./logo";
import { useI18n } from "./providers";
import { ThemeToggle } from "./theme-toggle";

function Top({ onBack }: { onBack?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="welcome-top">
      {onBack ? (
        <button type="button" className="link" onClick={() => { tap(); onBack(); }}><ChevronLeft aria-hidden size={18} />{t("auth.back")}</button>
      ) : <span />}
      <span className="cluster"><LangSwitch /><ThemeToggle /></span>
    </div>
  );
}

/** After the immersion: one calm page that asks the person to make Saath theirs. */
export function MakeYours({ onNext, onLogin, onBack }: { onNext: () => void; onLogin: () => void; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <main className="welcome navy-scene screen">
      <Top onBack={onBack} />
      <div className="welcome-body scene-in">
        <div className="welcome-figure">
          <Character look={{ outfit: "blazer", extra: "watch", place: "rooftop" }} age={27} size={210} mood="proud" />
        </div>
        <p className="wordmark"><LogoMark size={34} /> Saath <span className="logo-divider" aria-hidden /><SkywardEmblem size={38} /></p>
        <h1>{t("welcome.title")}</h1>
        <p className="lead">{t("welcome.lead")}</p>
        <ul className="welcome-points">
          {["p1", "p2", "p3"].map((key) => <li key={key}><Check aria-hidden size={16} strokeWidth={3} />{t(`welcome.${key}`)}</li>)}
        </ul>
        <button type="button" className="btn btn-primary" onClick={() => { tap(); onNext(); }} data-testid="welcome-create-account-button">{t("welcome.cta")}<ArrowRight aria-hidden size={18} /></button>
        <button type="button" className="btn btn-ghost" onClick={() => { tap(); onLogin(); }}>{t("auth.haveAccount")}</button>
      </div>
    </main>
  );
}

const STEPS: Record<Platform, { icon: React.ReactNode; key: string }[]> = {
  ios: [
    { icon: <Share aria-hidden size={20} />, key: "ios1" },
    { icon: <SquarePlus aria-hidden size={20} />, key: "ios2" },
    { icon: <Check aria-hidden size={20} />, key: "ios3" },
    { icon: <Smartphone aria-hidden size={20} />, key: "ios4" },
  ],
  android: [
    { icon: <MoreVertical aria-hidden size={20} />, key: "android1" },
    { icon: <Download aria-hidden size={20} />, key: "android2" },
    { icon: <Check aria-hidden size={20} />, key: "android3" },
    { icon: <Smartphone aria-hidden size={20} />, key: "android4" },
  ],
  desktop: [
    { icon: <Download aria-hidden size={20} />, key: "desktop1" },
    { icon: <Star aria-hidden size={20} />, key: "desktop2" },
    { icon: <Laptop aria-hidden size={20} />, key: "desktop3" },
  ],
};

/**
 * Put Saath on the home screen before the account is made. On an iPhone the home-screen app keeps its own storage,
 * separate from Safari, so the account has to be made inside the installed app or it will not be there.
 */
export function InstallStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const { installed, platform, canPrompt, prompt } = useInstall();
  const [shown, setShown] = useState<Platform>("desktop");
  useEffect(() => setShown(platform), [platform]);

  useEffect(() => {
    if (installed) onNext();
  }, [installed, onNext]);

  return (
    <main className="welcome screen install-page">
      <Top onBack={onBack} />
      <div className="welcome-body">
        <span className="install-icon" aria-hidden><LogoMark size={44} /></span>
        <p className="kicker">{t("installStep.kicker")}</p>
        <h1>{t("installStep.title")}</h1>
        <p className="lead">{t("installStep.lead")}</p>

        <div className="seg" role="group" aria-label={t("installStep.device")}>
          {(["ios", "android", "desktop"] as const).map((item) => (
            <button key={item} type="button" aria-pressed={shown === item} onClick={() => { tap(); setShown(item); }}>{t(`installStep.${item}`)}</button>
          ))}
        </div>

        {canPrompt && shown !== "ios" ? (
          <button type="button" className="btn btn-primary" onClick={async () => { tap(); await prompt(); }}>
            <Download aria-hidden size={18} />{t("install.cta")}
          </button>
        ) : null}

        <ol className="install-steps">
          {STEPS[shown].map((step, index) => (
            <li key={step.key}>
              <span className="install-num">{index + 1}</span>
              <span className="install-text">{t(`installStep.${step.key}`)}</span>
              <span className="install-glyph">{step.icon}</span>
            </li>
          ))}
        </ol>
        {shown === "ios" && <p className="note">{t("installStep.iosNote")}</p>}

        <button type="button" className="btn btn-primary" onClick={() => { tap(); onNext(); }}>{t("installStep.done")}<ArrowRight aria-hidden size={18} /></button>
        <button type="button" className="btn btn-ghost" onClick={() => { tap(); onNext(); }} data-testid="install-skip-button">{t("installStep.skip")}</button>
        <p className="faint center">{t("install.note")}</p>
      </div>
    </main>
  );
}
