"use client";

import { useState, type FormEvent } from "react";
import { ChevronLeft, Eye, EyeOff, KeyRound, UserRound } from "lucide-react";
import { checkPassword, checkUsername, logIn, PASSWORD_MIN, signUp, usernameTaken, type Account } from "@/lib/account";
import { todayISO } from "@/lib/dates";
import { resetLocalData } from "@/lib/profile";
import { tap } from "@/lib/speech";
import { useI18n } from "./providers";
import { ThemeToggle } from "./theme-toggle";

export type AuthMode = "signup" | "login";

export function AuthScreen({
  initial,
  onDone,
  onBack,
}: {
  initial: AuthMode;
  onDone: (account: Account, created: boolean) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<AuthMode>(initial);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  const signup = mode === "signup";
  const nameProblem = username ? checkUsername(username) : null;
  const taken = signup && username && !nameProblem ? usernameTaken(username) : false;
  const passProblem = signup && password ? checkPassword(password, username) : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (signup) {
        const result = await signUp({ username, password, today: todayISO() });
        if (!result.ok) setError(t(`auth.err.${result.error}`, { min: PASSWORD_MIN }));
        else onDone(result.account, true);
      } else {
        const result = await logIn({ username, password });
        if (!result.ok) setError(t(`auth.err.${result.error}`, { seconds: result.waitSeconds ?? 60 }));
        else onDone(result.account, false);
      }
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: AuthMode) {
    tap();
    setMode(next);
    setError(null);
    setForgot(false);
  }

  return (
    <main className="page bare gate screen">
      <div className="auth">
        <div className="row-between">
          <button type="button" className="link" onClick={() => { tap(); onBack(); }}>
            <ChevronLeft aria-hidden size={18} />
            {t("auth.back")}
          </button>
          <ThemeToggle />
        </div>
        <div className="stack-sm">
          <p className="masthead">Saath</p>
          <h1>{signup ? t("auth.signupTitle") : t("auth.loginTitle")}</h1>
          <p className="lead">{signup ? t("auth.signupLead") : t("auth.loginLead")}</p>
        </div>

        <form className="stack" onSubmit={submit} noValidate>
          <label>
            <span className="label">{t("auth.username")}</span>
            <span className="field-wrap">
              <UserRound aria-hidden size={18} />
              <input
                className="field text"
                name="username"
                value={username}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                aria-describedby="username-help"
                aria-invalid={Boolean(nameProblem || taken)}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </span>
            <span id="username-help" className={`faint${nameProblem || taken ? " field-err" : ""}`} role={nameProblem || taken ? "alert" : undefined}>
              {taken ? t("auth.err.taken") : nameProblem ? t(`auth.err.${nameProblem}`) : signup ? t("auth.usernameHelp") : ""}
            </span>
          </label>

          <label>
            <span className="label">{t("auth.password")}</span>
            <span className="field-wrap">
              <KeyRound aria-hidden size={18} />
              <input
                className="field text"
                name="password"
                type={show ? "text" : "password"}
                value={password}
                autoComplete={signup ? "new-password" : "current-password"}
                aria-describedby="password-help"
                aria-invalid={Boolean(passProblem)}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button type="button" className="icon-btn" style={{ border: 0 }} aria-label={show ? t("auth.hide") : t("auth.show")} aria-pressed={show} onClick={() => setShow((value) => !value)}>
                {show ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
              </button>
            </span>
            <span id="password-help" className={`faint${passProblem ? " field-err" : ""}`} role={passProblem ? "alert" : undefined}>
              {passProblem ? t(`auth.err.${passProblem}`, { min: PASSWORD_MIN }) : signup ? t("auth.passwordHelp", { min: PASSWORD_MIN }) : ""}
            </span>
          </label>

          {error && <p role="alert" className="note err">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={busy || !username || !password || Boolean(nameProblem) || Boolean(signup && (taken || passProblem))}>
            {busy ? t("auth.working") : signup ? t("auth.create") : t("auth.login")}
          </button>
        </form>

        <div className="stack-sm">
          <button type="button" className="btn btn-ghost" onClick={() => switchMode(signup ? "login" : "signup")}>
            {signup ? t("auth.haveAccount") : t("auth.needAccount")}
          </button>
          {!signup && (
            forgot ? (
              <div className="card flat tight stack-sm">
                <p className="note">{t("auth.forgotBody")}</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={async () => {
                    if (!window.confirm(t("auth.eraseConfirm"))) return;
                    await resetLocalData();
                    window.location.reload();
                  }}
                >
                  {t("auth.erase")}
                </button>
              </div>
            ) : (
              <button type="button" className="link" style={{ justifySelf: "center" }} onClick={() => setForgot(true)}>{t("auth.forgot")}</button>
            )
          )}
        </div>

        <p className="faint">{t("auth.where")}</p>
      </div>
    </main>
  );
}
