"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { CloudUpload, Download, Info, KeyRound, Lock, LogOut, Mail, ShieldCheck, Trash2, Upload } from "lucide-react";
import { parseBackup } from "@/lib/backup";
import { LANGS } from "@/lib/catalog";
import { clearPin, hasPin, setPin } from "@/lib/pin";
import { tap } from "@/lib/speech";
import { entriesToCsv, exportBackup } from "@/lib/storage";
import { useApp } from "./app-state";
import { NumPad } from "./numpad";
import { useI18n } from "./providers";
import { useSession } from "./session";
import { Sheet } from "./ui";

export type ProfileView = "main" | "signin" | "secret" | "pin" | "delete";

const LANG_NAMES = { en: "English", hi: "हिन्दी", mr: "मराठी" } as const;

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function displayName(user: { name: string | null; email: string | null } | null, guest: string): string {
  if (!user) return guest;
  return user.name?.trim() || user.email?.split("@")[0] || guest;
}

export function ProfileSheet({ initial, onClose }: { initial: ProfileView; onClose: () => void }) {
  const { t, lang, setLang } = useI18n();
  const app = useApp();
  const { sync } = app;
  const [view, setView] = useState<ProfileView>(initial);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [pin, setPinDraft] = useState("");
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [pinOn, setPinOn] = useState(() => hasPin());
  const fileRef = useRef<HTMLInputElement | null>(null);

  const session = useSession();
  const name = session.account.name;
  const go = (next: ProfileView) => {
    tap();
    setNote(null);
    setView(next);
  };

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setNote({ kind: "err", text: t("auth.badEmail") });
      return;
    }
    setBusy(true);
    const sent = await sync.signInWithEmail(email.trim());
    setBusy(false);
    setNote(sent ? { kind: "ok", text: t("auth.sent") } : { kind: "err", text: t("auth.failed") });
  }

  async function google() {
    tap();
    setBusy(true);
    const started = await sync.signInWithGoogle();
    setBusy(false);
    if (!started) setNote({ kind: "err", text: t("auth.failed") });
  }

  async function lock(event: FormEvent) {
    event.preventDefault();
    if (secret.trim().length < 8) {
      setNote({ kind: "err", text: t("auth.secretShort") });
      return;
    }
    setBusy(true);
    const result = await sync.unlock(secret.trim());
    setBusy(false);
    if (result === "ok") {
      setSecret("");
      setView("main");
      setNote({ kind: "ok", text: t("auth.synced") });
    } else {
      setNote({ kind: "err", text: result === "wrong" ? t("auth.secretWrong") : t("auth.failed") });
    }
  }

  async function pinDigit(digit: string) {
    const next = (pin + digit).slice(0, 4);
    setPinDraft(next);
    if (next.length < 4) return;
    if (firstPin === null) {
      setFirstPin(next);
      setPinDraft("");
      return;
    }
    if (firstPin !== next) {
      setFirstPin(null);
      setPinDraft("");
      setNote({ kind: "err", text: t("pin.mismatch") });
      return;
    }
    const saved = await setPin(next);
    setFirstPin(null);
    setPinDraft("");
    setPinOn(saved);
    setView("main");
    setNote(saved ? { kind: "ok", text: t("pin.on") } : { kind: "err", text: t("errors.generic") });
  }

  async function removeAccount() {
    tap();
    setBusy(true);
    const done = await sync.deleteAccount();
    setBusy(false);
    setView("main");
    setNote(done ? { kind: "ok", text: t("auth.deleted") } : { kind: "err", text: t("auth.failed") });
  }

  if (view === "signin") {
    return (
      <Sheet title={t("auth.title")} onClose={onClose}>
        <div className="stack">
          <p className="lead">{t("auth.lead")}</p>
          <form className="stack-sm" onSubmit={sendLink}>
            <label>
              <span className="label">{t("auth.email")}</span>
              <span className="field-wrap">
                <Mail aria-hidden size={18} />
                <input
                  className="field text"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </span>
            </label>
            <button type="submit" className="btn btn-primary" disabled={busy}>{t("auth.emailCta")}</button>
          </form>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={google}>{t("auth.google")}</button>
          {note && <p role="status" className={`note ${note.kind}`}>{note.text}</p>}
          {!pinOn && (
            <button type="button" className="link" onClick={() => go("pin")}>
              <Lock aria-hidden size={18} />
              {t("auth.pinOffer")}
            </button>
          )}
        </div>
      </Sheet>
    );
  }

  if (view === "secret") {
    return (
      <Sheet title={sync.hasRemote ? t("auth.secretAgainTitle") : t("auth.secretTitle")} onClose={onClose}>
        <form className="stack" onSubmit={lock}>
          <p className="lead">{sync.hasRemote ? t("auth.secretAgainLead") : t("auth.secretLead")}</p>
          <label>
            <span className="label">{t("auth.secretLabel")}</span>
            <span className="field-wrap">
              <KeyRound aria-hidden size={18} />
              <input
                className="field text"
                type="password"
                autoComplete={sync.hasRemote ? "current-password" : "new-password"}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
              />
            </span>
          </label>
          {note && <p role="status" className={`note ${note.kind}`}>{note.text}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? t("auth.syncing") : t("auth.secretCta")}
          </button>
        </form>
      </Sheet>
    );
  }

  if (view === "pin") {
    return (
      <Sheet title={firstPin === null ? t("pin.setTitle") : t("pin.again")} onClose={onClose}>
        <div className="stack">
          <div className="pin-dots" role="status" aria-label={t("pin.dots", { count: pin.length })}>
            {[0, 1, 2, 3].map((index) => <i key={index} className={index < pin.length ? "on" : ""} />)}
          </div>
          {note && <p role="status" className={`note ${note.kind} center`}>{note.text}</p>}
          <NumPad onDigit={pinDigit} onDelete={() => setPinDraft((current) => current.slice(0, -1))} deleteLabel={t("pin.delete")} />
        </div>
      </Sheet>
    );
  }

  if (view === "delete") {
    return (
      <Sheet title={t("auth.deleteTitle")} onClose={onClose}>
        <div className="stack">
          <p className="lead">{t("auth.deleteBody")}</p>
          <button type="button" className="btn btn-secondary btn-danger" disabled={busy} onClick={removeAccount}>
            <Trash2 aria-hidden size={18} />
            {t("auth.deleteCta")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => go("main")}>{t("common.cancel")}</button>
        </div>
      </Sheet>
    );
  }

  const statusLine = !sync.user
    ? t("profile.guestLine")
    : sync.status === "offline"
      ? t("auth.syncOffline")
      : sync.status === "saving"
        ? t("auth.syncing")
        : sync.status === "needs-secret"
          ? t("profile.guestLine")
          : t("profile.signedLine");

  return (
    <Sheet title={name} onClose={onClose}>
      <div className="stack">
        <div className="stack-xs">
          {sync.user?.email ? <p className="faint">{sync.user.email}</p> : null}
          <p className="lead">{statusLine}</p>
          {note && <p role="status" className={`note ${note.kind}`}>{note.text}</p>}
        </div>

        {sync.user && sync.status === "needs-secret" && (
          <button type="button" className="btn btn-primary" onClick={() => go("secret")}>
            <KeyRound aria-hidden size={18} />
            {t("profile.finish")}
          </button>
        )}
        {!sync.user && sync.configured && (
          <button type="button" className="btn btn-secondary" onClick={() => go("signin")}>
            <CloudUpload aria-hidden size={18} />
            {t("profile.signIn")}
          </button>
        )}

        <div>
          <p className="label">{t("profile.language")}</p>
          <div className="seg" role="group" aria-label={t("profile.language")}>
            {LANGS.map((item) => (
              <button
                key={item}
                type="button"
                lang={item}
                aria-pressed={item === lang}
                onClick={() => {
                  tap();
                  setLang(item);
                }}
              >
                {LANG_NAMES[item]}
              </button>
            ))}
          </div>
        </div>

        <ul className="list">
          <li>
            <Link className="item" href="/about" onClick={onClose}>
              <span className="item-icon"><Info aria-hidden size={20} /></span>
              <span className="item-body"><span className="item-title">{t("acct.about")}</span></span>
            </Link>
          </li>
          <li>
            <button
              type="button"
              className="item"
              onClick={async () => {
                tap();
                download("saath-backup.json", "application/json", JSON.stringify(await exportBackup()));
              }}
            >
              <span className="item-icon"><Download aria-hidden size={20} /></span>
              <span className="item-body"><span className="item-title">{t("profile.exportBackup")}</span></span>
            </button>
          </li>
          <li>
            <button type="button" className="item" onClick={() => fileRef.current?.click()}>
              <span className="item-icon"><Upload aria-hidden size={20} /></span>
              <span className="item-body">
                <span className="item-title">{t("profile.importBackup")}</span>
                <span className="item-sub">{t("money.importNote")}</span>
              </span>
            </button>
            <input
              ref={fileRef}
              className="visually-hidden"
              type="file"
              accept="application/json"
              tabIndex={-1}
              aria-hidden
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                try {
                  const parsed = parseBackup(JSON.parse(await file.text()));
                  if (!parsed) throw new Error("shape");
                  await app.restore(parsed);
                  setNote({ kind: "ok", text: t("profile.importDone") });
                } catch {
                  setNote({ kind: "err", text: t("money.importFail") });
                }
              }}
            />
          </li>
          <li>
            <button
              type="button"
              className="item"
              onClick={() => {
                tap();
                download("saath-money.csv", "text/csv", entriesToCsv(app.entries));
              }}
            >
              <span className="item-icon"><Download aria-hidden size={20} /></span>
              <span className="item-body"><span className="item-title">{t("money.export")}</span></span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className="item"
              onClick={() => {
                if (pinOn) {
                  tap();
                  clearPin();
                  setPinOn(false);
                  setNote({ kind: "ok", text: t("pin.off") });
                } else {
                  go("pin");
                }
              }}
            >
              <span className="item-icon"><Lock aria-hidden size={20} /></span>
              <span className="item-body">
                <span className="item-title">{pinOn ? t("profile.pinRemove") : t("profile.pinSet")}</span>
              </span>
            </button>
          </li>
          <li>
            <Link className="item" href="/privacy" onClick={onClose}>
              <span className="item-icon"><ShieldCheck aria-hidden size={20} /></span>
              <span className="item-body"><span className="item-title">{t("profile.privacy")}</span></span>
            </Link>
          </li>
          <li>
            <button
              type="button"
              className="item"
              onClick={() => {
                tap();
                onClose();
                session.logOut();
              }}
            >
              <span className="item-icon"><LogOut aria-hidden size={20} /></span>
              <span className="item-body"><span className="item-title">{t("acct.logout")}</span></span>
            </button>
          </li>
          {sync.user && (
            <>
              <li>
                <button
                  type="button"
                  className="item"
                  onClick={async () => {
                    tap();
                    await sync.signOut();
                  }}
                >
                  <span className="item-icon"><CloudUpload aria-hidden size={20} /></span>
                  <span className="item-body"><span className="item-title">{t("profile.signOut")}</span></span>
                </button>
              </li>
              <li>
                <button type="button" className="item" onClick={() => go("delete")}>
                  <span className="item-icon"><Trash2 aria-hidden size={20} /></span>
                  <span className="item-body"><span className="item-title">{t("profile.delete")}</span></span>
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    </Sheet>
  );
}
