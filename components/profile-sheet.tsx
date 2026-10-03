"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Download, Info, Lock, School, ShieldCheck, Trash2, Upload, UserRound } from "lucide-react";
import { parseBackup } from "@/lib/backup";
import { GRADES, LANGS } from "@/lib/catalog";
import { asset, IMPACT_URL } from "@/lib/config";
import { readFinLit, unitRatios } from "@/lib/finlit";
import { share } from "@/lib/impact";
import { clearPin, hasPin, setPin } from "@/lib/pin";
import { cleanCode, resetLocalData, saveJoin, setSharing } from "@/lib/profile";
import { tap } from "@/lib/speech";
import { entriesToCsv, exportBackup } from "@/lib/storage";
import { useApp } from "./app-state";
import { NumPad } from "./numpad";
import { useI18n } from "./providers";
import { useSession, type ProfileView } from "./session";
import { Sheet } from "./ui";

const LANG_NAMES = { en: "English", hi: "हिन्दी", mr: "मराठी" } as const;

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function ProfileSheet({ initial, onClose }: { initial: ProfileView; onClose: () => void }) {
  const { t, lang, setLang } = useI18n();
  const app = useApp();
  const { profile, setProfile } = useSession();
  const prefill = useMemo(() => {
    try {
      return window.sessionStorage.getItem("saath-school-prefill") ?? "";
    } catch {
      return "";
    }
  }, []);
  const [view, setView] = useState<ProfileView>(initial);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [nickname, setNickname] = useState(profile.nickname);
  const [code, setCode] = useState(profile.schoolCode ?? prefill);
  const [grade, setGrade] = useState<string>(profile.grade ?? "");
  const [pin, setPinDraft] = useState("");
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [pinOn, setPinOn] = useState(() => hasPin());
  const fileRef = useRef<HTMLInputElement | null>(null);

  const name = profile.nickname || t("profile.guest");
  const go = (next: ProfileView) => {
    tap();
    setNote(null);
    setView(next);
  };

  function join(event: FormEvent) {
    event.preventDefault();
    const result = saveJoin({ nickname, schoolCode: code, grade });
    if (!result.ok) {
      setNote({ kind: "err", text: t(`onboard.err.${result.error}`) });
      return;
    }
    try {
      window.sessionStorage.removeItem("saath-school-prefill");
    } catch {
      // Nothing to clear.
    }
    setProfile(result.profile);
    setView("main");
    setNote({ kind: "ok", text: result.profile.schoolCode ? t("onboard.joined") : t("money.logged") });
  }

  function toggleShare() {
    tap();
    const next = setSharing(!profile.shareAggregates);
    setProfile(next);
    // Switching on sends what already exists, once: that this student joined, and any check already taken.
    if (next.shareAggregates) {
      share(next, "join");
      const results = readFinLit();
      if (results.before) share(next, "check-before", { units: unitRatios(results.before) });
      if (results.after) share(next, "check-after", { units: unitRatios(results.after) });
      if (app.progress.lessons.length) share(next, "lesson", { count: app.progress.lessons.length });
      const paths = Object.keys(app.progress.milestones).length;
      if (paths) share(next, "path", { count: paths });
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

  if (view === "join") {
    return (
      <Sheet title={t("onboard.joinTitle")} onClose={onClose}>
        <form className="stack" onSubmit={join}>
          <p className="lead">{t("onboard.joinLead")}</p>
          <label>
            <span className="label">{t("onboard.schoolCode")}</span>
            <span className="field-wrap">
              <School aria-hidden size={18} />
              <input className="field text" value={code} maxLength={12} autoCapitalize="characters" autoComplete="off" onChange={(event) => setCode(cleanCode(event.target.value))} />
            </span>
          </label>
          <div>
            <p className="label" id="grade-label">{t("onboard.grade")}</p>
            <div className="seg" role="group" aria-labelledby="grade-label">
              {GRADES.map((item) => (
                <button key={item} type="button" aria-pressed={grade === item} onClick={() => { tap(); setGrade(item); }}>{item}</button>
              ))}
            </div>
          </div>
          <label>
            <span className="label">{t("onboard.nickname")}</span>
            <span className="field-wrap">
              <UserRound aria-hidden size={18} />
              <input className="field text" value={nickname} maxLength={20} autoComplete="off" onChange={(event) => setNickname(event.target.value)} />
            </span>
          </label>
          {note && <p role="status" className={`note ${note.kind}`}>{note.text}</p>}
          <button type="submit" className="btn btn-primary">{t("onboard.save")}</button>
          {profile.schoolCode && (
            <button type="button" className="btn btn-ghost" onClick={() => { setCode(""); setGrade(""); }}>{t("onboard.leave")}</button>
          )}
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
          <p className="faint">{t("pin.forgotBody")}</p>
        </div>
      </Sheet>
    );
  }

  if (view === "erase") {
    return (
      <Sheet title={t("profile.erase")} onClose={onClose}>
        <div className="stack">
          <p className="lead">{t("profile.eraseBody")}</p>
          <button
            type="button"
            className="btn btn-secondary btn-danger"
            onClick={async () => {
              tap();
              await resetLocalData();
              window.location.href = asset("/");
            }}
          >
            <Trash2 aria-hidden size={18} />
            {t("profile.eraseCta")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => go("main")}>{t("common.cancel")}</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={name} onClose={onClose}>
      <div className="stack">
        <div className="stack-xs">
          <p className="lead">
            {profile.schoolCode && profile.grade ? t("profile.school", { code: profile.schoolCode, grade: profile.grade }) : t("profile.guestLine")}
          </p>
          {note && <p role="status" className={`note ${note.kind}`}>{note.text}</p>}
        </div>

        <button type="button" className="btn btn-secondary" onClick={() => go("join")}>
          <School aria-hidden size={18} />
          {profile.schoolCode ? t("profile.edit") : t("onboard.joinTitle")}
        </button>

        {profile.schoolCode && (
          <div className="card flat tight stack-sm">
            <div className="row-between">
              <strong id="share-label">{t("profile.shareTitle")}</strong>
              <button type="button" className="switch" role="switch" aria-checked={profile.shareAggregates} aria-labelledby="share-label" onClick={toggleShare}>
                <i />
              </button>
            </div>
            <p className="faint">{t("profile.shareBody")}</p>
            <p className="faint">
              <strong>{profile.shareAggregates ? t("profile.shareOn") : t("profile.shareOff")}</strong>
              {!IMPACT_URL ? ` ${t("profile.shareNowhere")}` : ""}
            </p>
          </div>
        )}

        <div>
          <p className="label">{t("profile.language")}</p>
          <div className="seg" role="group" aria-label={t("profile.language")}>
            {LANGS.map((item) => (
              <button key={item} type="button" lang={item} aria-pressed={item === lang} onClick={() => { tap(); setLang(item); }}>
                {LANG_NAMES[item]}
              </button>
            ))}
          </div>
        </div>

        <ul className="list">
          <li>
            <Link className="item" href="/about" onClick={onClose}>
              <span className="item-icon"><Info aria-hidden size={20} /></span>
              <span className="item-body"><span className="item-title">{t("profile.how")}</span></span>
            </Link>
          </li>
          <li>
            <button type="button" className="item" onClick={() => { if (pinOn) { tap(); clearPin(); setPinOn(false); setNote({ kind: "ok", text: t("pin.off") }); } else go("pin"); }}>
              <span className="item-icon"><Lock aria-hidden size={20} /></span>
              <span className="item-body"><span className="item-title">{pinOn ? t("profile.pinRemove") : t("profile.pinSet")}</span></span>
            </button>
          </li>
          <li>
            <button type="button" className="item" onClick={async () => { tap(); download("saath-backup.json", "application/json", JSON.stringify(await exportBackup())); }}>
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
            <button type="button" className="item" onClick={() => { tap(); download("saath-money.csv", "text/csv", entriesToCsv(app.entries)); }}>
              <span className="item-icon"><Download aria-hidden size={20} /></span>
              <span className="item-body"><span className="item-title">{t("money.export")}</span></span>
            </button>
          </li>
          <li>
            <Link className="item" href="/privacy" onClick={onClose}>
              <span className="item-icon"><ShieldCheck aria-hidden size={20} /></span>
              <span className="item-body"><span className="item-title">{t("profile.privacy")}</span></span>
            </Link>
          </li>
          <li>
            <button type="button" className="item" onClick={() => go("erase")}>
              <span className="item-icon"><Trash2 aria-hidden size={20} /></span>
              <span className="item-body"><span className="item-title">{t("profile.erase")}</span></span>
            </button>
          </li>
        </ul>
      </div>
    </Sheet>
  );
}
