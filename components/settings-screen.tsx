"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronRight, Cpu, Download, Info, KeyRound, LogOut, ShieldCheck, Trash2, Upload } from "lucide-react";
import { changePassword, deleteAccountData, PASSWORD_MIN } from "@/lib/account";
import { isDownloaded, LOCAL_MODELS, loadModel, modelSizeBytes, onlineConfigured, removeModel, webgpuReady } from "@/lib/ai";
import { parseBackup } from "@/lib/backup";
import { LANGS } from "@/lib/catalog";
import { tap } from "@/lib/speech";
import { entriesToCsv, eraseDevice, exportBackup, setMeta } from "@/lib/storage";
import { useApp } from "./app-state";
import { InstallPanel } from "./install";
import { TopicPicker } from "./personalize";
import { usePrefs } from "./prefs";
import { useI18n } from "./providers";
import { useSession } from "./session";
import { ThemePicker } from "./theme-toggle";

const LANG_NAMES = { en: "English", hi: "हिन्दी", mr: "मराठी" } as const;

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Switch({ id, label, sub, on, onChange, disabled }: { id: string; label: string; sub?: string; on: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <div className="setting">
      <span className="stack-xs">
        <span id={id} className="item-title">{label}</span>
        {sub && <span className="faint">{sub}</span>}
      </span>
      <button type="button" className="switch" role="switch" aria-checked={on} aria-labelledby={id} disabled={disabled} onClick={() => { tap(); onChange(!on); }}>
        <i />
      </button>
    </div>
  );
}

function Group({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section className="stack-sm" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <div className="card tight stack-sm settings-group">{children}</div>
    </section>
  );
}

function megabytes(bytes: number): string {
  return `${Math.round(bytes / 1_000_000)} MB`;
}

/** Downloading, switching on and removing the model that runs in this browser. */
function LocalModelPanel() {
  const { t } = useI18n();
  const { prefs, update } = usePrefs();
  const [gpu, setGpu] = useState<boolean | null>(null);
  const [have, setHave] = useState<Record<string, boolean>>({});
  const [sizes, setSizes] = useState<Record<string, number | null | undefined>>({});
  const [busy, setBusy] = useState<{ ratio: number; text: string } | null>(null);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const model = prefs.aiModel;

  useEffect(() => {
    let live = true;
    // The model library is large. It is only loaded, and the model host only contacted, when this browser could run it.
    webgpuReady().then((ok) => {
      if (!live) return;
      setGpu(ok);
      if (ok) Promise.all(LOCAL_MODELS.map(async (item) => [item.id, await isDownloaded(item.id)] as const)).then((list) => live && setHave(Object.fromEntries(list)));
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!gpu || sizes[model] !== undefined) return;
    let live = true;
    modelSizeBytes(model).then((size) => live && setSizes((current) => ({ ...current, [model]: size })));
    return () => {
      live = false;
    };
  }, [gpu, model, sizes]);

  async function get() {
    tap();
    setNote(null);
    setBusy({ ratio: 0, text: "" });
    try {
      await loadModel(model, (progress) => setBusy(progress));
      setHave((current) => ({ ...current, [model]: true }));
      update({ aiLocal: true });
      setNote({ kind: "ok", text: t("settings.localReady") });
    } catch {
      setNote({ kind: "err", text: t("settings.localFailed") });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    tap();
    setNote(null);
    try {
      await removeModel(model);
      setHave((current) => ({ ...current, [model]: false }));
      update({ aiLocal: false });
      setNote({ kind: "ok", text: t("settings.localRemoved") });
    } catch {
      setNote({ kind: "err", text: t("errors.generic") });
    }
  }

  if (gpu === null) return <p className="faint">{t("common.loading")}</p>;
  if (!gpu) return <p className="note">{t("settings.localNoGpu")}</p>;
  const size = sizes[model];
  const ready = have[model] === true;

  return (
    <div className="stack-sm">
      <p className="faint">{t("settings.localLead")}</p>
      <div className="seg" role="group" aria-label={t("settings.localModel")}>
        {LOCAL_MODELS.map((item) => (
          <button key={item.id} type="button" aria-pressed={model === item.id} disabled={Boolean(busy)} onClick={() => { tap(); update({ aiModel: item.id, aiLocal: false }); }}>
            {t(`settings.model.${item.key}`)}
          </button>
        ))}
      </div>
      <p className="faint">
        {size === undefined ? t("settings.localSizeChecking") : size === null ? t("settings.localSizeUnknown") : t("settings.localSize", { size: megabytes(size) })}
        {" "}{t(`settings.modelNote.${LOCAL_MODELS.find((item) => item.id === model)?.key ?? "small"}`)}
      </p>
      {busy ? (
        <div className="stack-xs" role="status" aria-live="polite">
          <div className="bar" aria-hidden><span style={{ width: `${Math.max(2, busy.ratio * 100)}%` }} /></div>
          <p className="faint num">{Math.round(busy.ratio * 100)}% · {t("settings.localDownloading")}</p>
        </div>
      ) : ready ? (
        <>
          <Switch id="ai-local" label={t("settings.localUse")} sub={t("settings.localUseSub")} on={prefs.aiLocal} onChange={(next) => update({ aiLocal: next })} />
          <button type="button" className="btn btn-ghost" onClick={() => void remove()}><Trash2 aria-hidden size={18} />{t("settings.localRemove")}</button>
        </>
      ) : (
        <button type="button" className="btn btn-secondary" onClick={() => void get()}><Download aria-hidden size={18} />{t("settings.localGet")}</button>
      )}
      {note && <p role="status" className={`note ${note.kind}`}>{note.text}</p>}
      <p className="faint">{t("settings.localPrivacy")}</p>
    </div>
  );
}

function PasswordForm({ id }: { id: string }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNote(null);
    const result = await changePassword({ id, current, next });
    setBusy(false);
    if (result.ok) {
      setCurrent("");
      setNext("");
      setNote({ kind: "ok", text: t("settings.passwordChanged") });
    } else {
      setNote({ kind: "err", text: t(`auth.err.${result.error}`, { min: PASSWORD_MIN }) });
    }
  }

  return (
    <form className="stack-sm" onSubmit={submit}>
      <label>
        <span className="label">{t("settings.currentPassword")}</span>
        <input className="field text boxed" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
      </label>
      <label>
        <span className="label">{t("settings.newPassword")}</span>
        <input className="field text boxed" type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} />
        <span className="faint">{t("auth.passwordHelp", { min: PASSWORD_MIN })}</span>
      </label>
      {note && <p role="status" className={`note ${note.kind}`}>{note.text}</p>}
      <button type="submit" className="btn btn-secondary" disabled={busy || !current || !next}><KeyRound aria-hidden size={18} />{t("settings.changePassword")}</button>
    </form>
  );
}

export function SettingsScreen() {
  const { t, lang, setLang } = useI18n();
  const { prefs, update } = usePrefs();
  const app = useApp();
  const { account, logout } = useSession();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [dataNote, setDataNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [focus, setFocus] = useState<string[]>(app.progress.focus);
  const focusChanged = focus.join() !== app.progress.focus.join();

  return (
    <div className="stack-lg">
      <div className="stack-xs">
        <p className="masthead">{account?.display}</p>
        <h1>{t("settings.title")}</h1>
      </div>

      <Group id="look-h" title={t("settings.look")}>
        <div className="stack-xs">
          <p className="label">{t("theme.label")}</p>
          <ThemePicker />
        </div>
        <div className="stack-xs">
          <p className="label">{t("profile.language")}</p>
          <div className="seg" role="group" aria-label={t("profile.language")}>
            {LANGS.map((item) => (
              <button key={item} type="button" lang={item} aria-pressed={item === lang} onClick={() => { tap(); setLang(item); }}>{LANG_NAMES[item]}</button>
            ))}
          </div>
        </div>
        <div className="stack-xs">
          <p className="label">{t("settings.text")}</p>
          <div className="seg" role="group" aria-label={t("settings.text")}>
            {(["normal", "large", "xl"] as const).map((item) => (
              <button key={item} type="button" aria-pressed={prefs.text === item} onClick={() => { tap(); update({ text: item }); }}>{t(`settings.textSize.${item}`)}</button>
            ))}
          </div>
        </div>
        <Switch id="motion" label={t("settings.motion")} sub={t("settings.motionSub")} on={prefs.motion === "reduce"} onChange={(next) => update({ motion: next ? "reduce" : "system" })} />
        <Switch id="contrast" label={t("settings.contrast")} on={prefs.contrast} onChange={(next) => update({ contrast: next })} />
        <Switch id="sound" label={t("settings.sound")} on={prefs.sound} onChange={(next) => update({ sound: next })} />
        <Switch id="haptics" label={t("settings.haptics")} sub={t("settings.hapticsSub")} on={prefs.haptics} onChange={(next) => update({ haptics: next })} />
      </Group>

      <Group id="ai-h" title={t("settings.ai")}>
        <Switch id="ai-on" label={t("settings.aiOn")} sub={t("settings.aiOnSub")} on={prefs.ai} onChange={(next) => update({ ai: next })} />
        {prefs.ai && (
          <>
            <Switch
              id="ai-memory"
              label={t("settings.aiMemory")}
              sub={t("settings.aiMemorySub")}
              on={prefs.aiMemory}
              onChange={(next) => {
                update({ aiMemory: next });
                if (!next) void setMeta("ai-chat", []).catch(() => undefined);
              }}
            />
            <div className="stack-xs">
              <p className="label"><Cpu aria-hidden size={16} style={{ verticalAlign: "-3px" }} /> {t("settings.local")}</p>
              <LocalModelPanel />
            </div>
            {onlineConfigured() ? (
              <Switch id="ai-online" label={t("settings.aiOnline")} sub={t("settings.aiOnlineSub")} on={prefs.aiOnline} disabled={prefs.aiLocal} onChange={(next) => update({ aiOnline: next })} />
            ) : (
              <p className="faint">{t("settings.aiOnlineNone")}</p>
            )}
            <p className="faint">{t("settings.aiOrder")}</p>
          </>
        )}
      </Group>

      <Group id="focus-h" title={t("settings.focus")}>
        <p className="faint">{t("settings.focusLead")}</p>
        <TopicPicker value={focus} onChange={setFocus} />
        <button type="button" className="btn btn-secondary" disabled={!focusChanged} onClick={() => { tap(); void app.saveFocus(focus); }}>{t("common.save")}</button>
      </Group>

      {account && (
        <Group id="account-h" title={t("settings.account")}>
          <p className="faint">{t("settings.signedInAs", { name: account.display })}</p>
          <PasswordForm id={account.id} />
          <button type="button" className="btn btn-ghost" onClick={() => { tap(); logout(); }}><LogOut aria-hidden size={18} />{t("settings.logout")}</button>
          <button
            type="button"
            className="btn btn-ghost btn-danger"
            onClick={async () => {
              if (!window.confirm(t("settings.deleteAccountConfirm", { name: account.display }))) return;
              await deleteAccountData(account);
              logout();
            }}
          >
            <Trash2 aria-hidden size={18} />{t("settings.deleteAccount")}
          </button>
          <p className="faint">{t("settings.accountNote")}</p>
        </Group>
      )}

      <Group id="data-h" title={t("settings.data")}>
        <p className="faint">{t("settings.dataLead")}</p>
        <button type="button" className="btn btn-secondary" onClick={async () => { tap(); download("saath-backup.json", "application/json", JSON.stringify(await exportBackup())); }}>
          <Download aria-hidden size={18} />{t("profile.exportBackup")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          <Upload aria-hidden size={18} />{t("profile.importBackup")}
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
              setDataNote({ kind: "ok", text: t("profile.importDone") });
            } catch {
              setDataNote({ kind: "err", text: t("money.importFail") });
            }
          }}
        />
        <button type="button" className="btn btn-ghost" onClick={() => { tap(); download("saath-money.csv", "text/csv", entriesToCsv(app.entries)); }}>
          <Download aria-hidden size={18} />{t("money.export")}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-danger"
          onClick={async () => {
            if (!window.confirm(t("settings.eraseConfirm"))) return;
            await eraseDevice();
            window.location.reload();
          }}
        >
          <Trash2 aria-hidden size={18} />{t("settings.erase")}
        </button>
        {dataNote && <p role="status" className={`note ${dataNote.kind}`}>{dataNote.text}</p>}
      </Group>

      <Group id="install-h" title={t("install.title")}>
        <InstallPanel />
      </Group>

      <ul className="list card tight">
        <li>
          <Link className="item" href="/privacy">
            <span className="item-icon"><ShieldCheck aria-hidden size={20} /></span>
            <span className="item-body"><span className="item-title">{t("profile.privacy")}</span></span>
            <span className="item-end"><ChevronRight aria-hidden size={20} /></span>
          </Link>
        </li>
        <li>
          <Link className="item" href="/about">
            <span className="item-icon"><Info aria-hidden size={20} /></span>
            <span className="item-body"><span className="item-title">{t("profile.how")}</span></span>
            <span className="item-end"><ChevronRight aria-hidden size={20} /></span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
