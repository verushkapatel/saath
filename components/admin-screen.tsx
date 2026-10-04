"use client";

import { useState, type FormEvent } from "react";
import { Activity, LockKeyhole, RefreshCw } from "lucide-react";
import { getLiveUsers, serviceConfigured, type LiveUsers } from "@/lib/service";
import { useI18n } from "./providers";

const COPY = {
  en: { kicker: "Owner", title: "Live users", lead: "A privacy-conscious count of anonymous active sessions. No usernames or financial information are collected.", user: "Owner username", pass: "Owner password", open: "View live count", refresh: "Refresh", active: "Active in the last {n} minutes", measured: "Measured {time}", fail: "The count could not be loaded. Check the owner credentials and service setup.", offline: "Live-user measurement is not connected in this build." },
  hi: { kicker: "मालिक", title: "लाइव उपयोगकर्ता", lead: "गुमनाम सक्रिय सत्रों की निजता-सुरक्षित गिनती। कोई यूज़रनेम या आर्थिक जानकारी नहीं ली जाती।", user: "मालिक यूज़रनेम", pass: "मालिक पासवर्ड", open: "लाइव गिनती देखें", refresh: "फिर देखें", active: "पिछले {n} मिनट में सक्रिय", measured: "{time} पर मापा", fail: "गिनती नहीं खुली। मालिक की जानकारी और सेवा सेटअप जाँचें।", offline: "इस बिल्ड में लाइव उपयोगकर्ता मापने की सेवा नहीं जुड़ी है।" },
  mr: { kicker: "मालक", title: "लाइव्ह वापरकर्ते", lead: "निनावी सक्रिय सत्रांची गोपनीयता-जपणारी मोजणी. युजरनेम किंवा आर्थिक माहिती घेतली जात नाही.", user: "मालक युजरनेम", pass: "मालक पासवर्ड", open: "लाइव्ह संख्या पाहा", refresh: "पुन्हा पाहा", active: "मागील {n} मिनिटांत सक्रिय", measured: "{time} वाजता मोजले", fail: "संख्या उघडली नाही. मालक माहिती आणि सेवा सेटअप तपासा.", offline: "या बिल्डमध्ये लाइव्ह वापरकर्ता मोजणी सेवा जोडलेली नाही." },
} as const;

export function AdminScreen() {
  const { code } = useI18n();
  const copy = COPY[code];
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<LiveUsers | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(event?: FormEvent) {
    event?.preventDefault();
    if (!username || !password || busy) return;
    setBusy(true);
    setError(null);
    try { setResult(await getLiveUsers(username, password)); }
    catch { setError(serviceConfigured() ? copy.fail : copy.offline); }
    finally { setBusy(false); }
  }

  return (
    <div className="stack-lg admin-screen" data-testid="admin-live-users-screen">
      <header className="stack-sm">
        <p className="masthead">{copy.kicker}</p>
        <h1 data-testid="admin-live-users-title">{copy.title}</h1>
        <p className="lead">{copy.lead}</p>
      </header>
      {!result ? (
        <form className="card stack" onSubmit={load} data-testid="admin-login-form">
          <span className="item-icon"><LockKeyhole aria-hidden size={20} /></span>
          <label><span className="label">{copy.user}</span><input className="field text boxed" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} data-testid="admin-username-input" /></label>
          <label><span className="label">{copy.pass}</span><input className="field text boxed" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} data-testid="admin-password-input" /></label>
          <button className="btn btn-primary" type="submit" disabled={busy || !username || !password} data-testid="admin-login-button">{copy.open}</button>
          {error && <p className="note err" role="alert" data-testid="admin-error-message">{error}</p>}
        </form>
      ) : (
        <section className="card hero live-card stack-sm" data-testid="admin-live-count-card">
          <Activity aria-hidden size={28} />
          <p className="hero-num" data-testid="admin-active-user-count">{result.activeNow}</p>
          <h2>{copy.active.replace("{n}", String(result.windowMinutes))}</h2>
          <p className="faint">{copy.measured.replace("{time}", new Date(result.measuredAt).toLocaleTimeString(code))}</p>
          <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={busy} data-testid="admin-refresh-button"><RefreshCw aria-hidden size={18} />{copy.refresh}</button>
        </section>
      )}
    </div>
  );
}