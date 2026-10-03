"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ChevronLeft, Eye, EyeOff, KeyRound, UserRound } from "lucide-react";
import { createAccount, listAccounts, logIn, type Account, type AccountError } from "@/lib/account";
import { tap } from "@/lib/speech";
import { FeatureDemo } from "./intro-demos";
import { useI18n } from "./providers";
import { Footer, ListenButton, SkywardMark } from "./ui";

const SECTIONS = 8;

/** Fades each section in as it scrolls into view. Content stays visible if the browser cannot observe. */
function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = [...root.querySelectorAll<HTMLElement>(".feature")];
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -12% 0px" });
    items.forEach((item) => {
      if (item.getBoundingClientRect().top > window.innerHeight * 0.9) item.classList.add("pre");
      observer.observe(item);
    });
    return () => observer.disconnect();
  }, []);
  return ref;
}

/**
 * Every feature in full: what it is, a small working model to try, and three steps on how to use it.
 * Shown before sign-up and again from the profile.
 */
export function FeatureGuide() {
  const { t } = useI18n();
  const ref = useReveal();
  return (
    <div className="features" ref={ref}>
      {Array.from({ length: SECTIONS }, (_, index) => {
        const n = index + 1;
        const steps = ["a", "b", "c"].map((key) => t(`intro.s${n}${key}`));
        const spoken = `${t(`intro.s${n}T`)}. ${t(`intro.s${n}P`)} ${steps.join(" ")}`;
        return (
          <section className="feature" key={n} aria-labelledby={`feature-${n}`}>
            <div className="row-between">
              <p className="feature-num" aria-hidden>{String(n).padStart(2, "0")}</p>
              {n !== 3 && <ListenButton compact text={spoken} label={t("demo.hear")} />}
            </div>
            <h2 id={`feature-${n}`}>{t(`intro.s${n}T`)}</h2>
            <p className="lead">{t(`intro.s${n}P`)}</p>
            <FeatureDemo index={n} text={spoken} />
            {n !== 8 && (
              <div className="stack-sm">
                <p className="kicker">{t("intro.how")}</p>
                <ol className="howto">
                  {steps.map((step, at) => <li key={at}><span>{step}</span></li>)}
                </ol>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

const ERRORS: Record<AccountError, string> = {
  nameShort: "acct.nameShort",
  nameTaken: "acct.nameTaken",
  passShort: "acct.passShort",
  passMatch: "acct.passMatch",
  noUser: "acct.noUser",
  passBad: "acct.passBad",
  noCrypto: "acct.noCrypto",
};

function PasswordField({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <label>
      <span className="label">{label}</span>
      <span className="field-wrap">
        <KeyRound aria-hidden size={18} />
        <input
          className="field text"
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="icon-btn"
          style={{ border: 0 }}
          aria-pressed={show}
          aria-label={t("acct.password")}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
        </button>
      </span>
    </label>
  );
}

/** Nobody reaches the app without an account. This is the introduction, then create or log in. */
export function Welcome({ onAccount }: { onAccount: (account: Account) => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"intro" | "create" | "login">("intro");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const known = typeof window === "undefined" ? [] : listAccounts();

  function go(next: typeof mode) {
    tap();
    setError("");
    setPassword("");
    setAgain("");
    setMode(next);
    window.scrollTo({ top: 0 });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = mode === "create" ? await createAccount(name, password, again) : await logIn(name, password);
    setBusy(false);
    if (result.ok) onAccount(result.account);
    else setError(t(ERRORS[result.error]));
  }

  if (mode !== "intro") {
    const creating = mode === "create";
    return (
      <main className="page bare screen">
        <form className="auth" onSubmit={submit}>
          <button type="button" className="link" onClick={() => go("intro")}>
            <ChevronLeft aria-hidden size={18} />
            {t("common.back")}
          </button>
          <div className="stack-sm">
            <SkywardMark size={44} />
            <h1>{creating ? t("acct.createTitle") : t("acct.loginTitle")}</h1>
            <p className="lead">{creating ? t("acct.createLead") : t("acct.loginLead")}</p>
          </div>
          {!creating && known.length > 0 && (
            <div className="cluster" role="group" aria-label={t("acct.name")}>
              {known.map((item) => (
                <button key={item.id} type="button" className="chip" aria-pressed={name === item.name} onClick={() => { tap(); setName(item.name); }}>
                  {item.name}
                </button>
              ))}
            </div>
          )}
          <label>
            <span className="label">{t("acct.name")}</span>
            <span className="field-wrap">
              <UserRound aria-hidden size={18} />
              <input className="field text" autoComplete="username" maxLength={30} value={name} onChange={(event) => setName(event.target.value)} />
            </span>
          </label>
          <PasswordField label={t("acct.password")} value={password} onChange={setPassword} autoComplete={creating ? "new-password" : "current-password"} />
          {creating && <PasswordField label={t("acct.again")} value={again} onChange={setAgain} autoComplete="new-password" />}
          {error && <p role="alert" className="note err">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? t("acct.working") : creating ? t("intro.create") : t("intro.login")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => go(creating ? "login" : "create")}>
            {creating ? t("acct.haveOne") : t("acct.needOne")}
          </button>
        </form>
      </main>
    );
  }

  return <IntroPage onCreate={() => go("create")} onLogin={() => go("login")} />;
}

function IntroPage({ onCreate, onLogin }: { onCreate: () => void; onLogin: () => void }) {
  const { t } = useI18n();
  const heroCta = useRef<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState(false);

  // Once the first buttons scroll away, keep one within reach of the thumb.
  useEffect(() => {
    const target = heroCta.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setPinned(!entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="page bare">
      <div className="intro screen">
        <section className="intro-hero">
          <div className="brand">
            <SkywardMark />
            <span className="brand-name">Saath</span>
          </div>
          <div className="stack-sm">
            <p className="kicker">{t("intro.eyebrow")}</p>
            <h1>{t("intro.title")}</h1>
            <p className="lead">{t("intro.lead")}</p>
          </div>
          <div className="stack-sm" ref={heroCta}>
            <button type="button" className="btn btn-primary" onClick={onCreate}>{t("intro.create")}</button>
            <button type="button" className="btn btn-secondary" onClick={onLogin}>{t("intro.login")}</button>
          </div>
          <a className="link scroll-hint" href="#features">
            {t("demo.scroll")}
            <ArrowDown aria-hidden size={18} />
          </a>
        </section>
        <div id="features" style={{ scrollMarginTop: 16 }}>
          <FeatureGuide />
        </div>
        <section className="feature in stack-sm" style={{ textAlign: "center", justifyItems: "center" }}>
          <h2>{t("intro.title")}</h2>
          <button type="button" className="btn btn-primary" onClick={onCreate}>{t("intro.create")}</button>
          <button type="button" className="btn btn-ghost" onClick={onLogin}>{t("acct.haveOne")}</button>
        </section>
        <Footer />
      </div>
      <div className={`cta-bar${pinned ? " show" : ""}`} aria-hidden={!pinned}>
        <button type="button" className="btn btn-primary" tabIndex={pinned ? 0 : -1} onClick={onCreate}>{t("intro.create")}</button>
        <button type="button" className="btn btn-ghost btn-auto" tabIndex={pinned ? 0 : -1} onClick={onLogin}>{t("intro.login")}</button>
      </div>
    </main>
  );
}
