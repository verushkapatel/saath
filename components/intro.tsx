"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight, BookOpen, Check, FileText, Flame as FlameIcon, MessageCircle, Search, Share2, Sparkles, Wallet } from "lucide-react";
import { TOPICS } from "@/lib/catalog";
import { inr } from "@/lib/format";
import { tap } from "@/lib/speech";
import { Character } from "./character";
import { LangSwitch } from "./lang-switch";
import { Logo } from "./logo";
import { useI18n } from "./providers";
import { ThemeToggle } from "./theme-toggle";

/** Fades a section in the first time it scrolls into view. */
function Reveal({ children, id, navy, onSeen }: { children: React.ReactNode; id?: string; navy?: boolean; onSeen?: () => void }) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          onSeen?.();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <section ref={ref} id={id} className={`act${navy ? " act-navy navy-scene" : ""}${seen ? " in" : ""}`}>{children}</section>;
}

function ActHead({ n, title, lead }: { n: string; title: string; lead: string }) {
  return (
    <header className="stack-sm">
      <p className="act-num" aria-hidden>{n}</p>
      <h2>{title}</h2>
      <p className="lead">{lead}</p>
    </header>
  );
}

/** A real, playable slice of the story: decide, see what follows, earn XP. */
function PlayEpisode({ onXp }: { onXp: (xp: number) => void }) {
  const { t } = useI18n();
  const [pick, setPick] = useState<number | null>(null);
  const verdicts = ["costly", "good", "okay"] as const;
  return (
    <div className="demo stage">
      <div className="demo-split">
        <Character look={{ outfit: "kurta", extra: "none", place: "room" }} age={22} size={132} label={t("intro.play.figure")} />
        <div className="stack-sm">
          <p className="kicker">{t("intro.play.kicker")}</p>
          <p>{t("intro.play.story")}</p>
        </div>
      </div>
      <p><strong>{t("intro.play.question")}</strong></p>
      <div className="stack-sm" role="group" aria-label={t("intro.play.question")}>
        {[0, 1, 2].map((index) => (
          <button
            key={index}
            type="button"
            className={`option${pick === index ? (verdicts[index] === "good" ? " is-best" : " is-mine") : ""}${pick !== null && pick !== index ? " is-dim" : ""}`}
            aria-pressed={pick === index}
            onClick={() => {
              tap();
              if (pick === null) onXp(verdicts[index] === "good" ? 50 : 40);
              setPick(index);
            }}
          >
            <span className="option-mark" aria-hidden>{pick === index ? <Check size={16} strokeWidth={3} /> : null}</span>
            <span>{t(`intro.play.option${index}`)}</span>
          </button>
        ))}
      </div>
      <div className="consequence" role="status" aria-live="polite">
        {pick === null ? (
          <p className="faint">{t("intro.play.hint")}</p>
        ) : (
          <div className="stack-sm">
            <p className="kicker">{t(`journey.verdict.${verdicts[pick]}`)}</p>
            <p>{t(`intro.play.outcome${pick}`)}</p>
            <p className="muted">{t("intro.play.lesson")}</p>
            <p className="xp-pop"><Sparkles aria-hidden size={16} /> {t("intro.play.xp", { xp: verdicts[pick] === "good" ? 50 : 40 })}</p>
            <button type="button" className="link" onClick={() => setPick(null)}>{t("intro.play.again")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressDemo({ xp }: { xp: number }) {
  const { t } = useI18n();
  const [outfit, setOutfit] = useState("kurta");
  const [place, setPlace] = useState("room");
  const outfits = ["kurta", "blazer", "sari"];
  const places = ["room", "office", "garden"];
  return (
    <div className="demo stage">
      <div className="demo-split">
        <Character look={{ outfit, extra: xp > 0 ? "bag" : "none", place }} age={outfit === "sari" ? 34 : 24} size={150} label={t("intro.progress.figure")} />
        <div className="stack-sm" style={{ alignContent: "center" }}>
          <div className="row-between">
            <span className="kicker">{t("prog.level", { level: 1 })}</span>
            <span className="num faint">{xp} / 100 XP</span>
          </div>
          <div className="bar" aria-hidden><span style={{ width: `${Math.max(4, Math.min(100, xp))}%` }} /></div>
          <p className="streak-line"><FlameIcon aria-hidden size={18} /> {xp > 0 ? t("intro.progress.streakOn") : t("intro.progress.streakOff")}</p>
        </div>
      </div>
      <div className="stack-sm">
        <p className="label">{t("prog.outfit")}</p>
        <div className="cluster" role="group" aria-label={t("prog.outfit")}>
          {outfits.map((id) => (
            <button key={id} type="button" className="chip" aria-pressed={outfit === id} onClick={() => { tap(); setOutfit(id); }}>{t(`rewards.outfit.${id}`)}</button>
          ))}
        </div>
        <p className="label">{t("prog.place")}</p>
        <div className="cluster" role="group" aria-label={t("prog.place")}>
          {places.map((id) => (
            <button key={id} type="button" className="chip" aria-pressed={place === id} onClick={() => { tap(); setPlace(id); }}>{t(`rewards.place.${id}`)}</button>
          ))}
        </div>
        <p className="faint">{t("intro.progress.note")}</p>
      </div>
    </div>
  );
}

function GuideDemo() {
  const { t } = useI18n();
  const [pick, setPick] = useState(0);
  return (
    <div className="demo">
      <div className="field-wrap" style={{ marginTop: 0 }} aria-hidden>
        <Search size={18} />
        <span className="field text" style={{ display: "flex", alignItems: "center" }}>{t(`intro.guides.q${pick}`)}</span>
      </div>
      <div className="cluster" role="group" aria-label={t("intro.guides.try")}>
        {[0, 1, 2].map((index) => (
          <button key={index} type="button" className="chip" aria-pressed={pick === index} onClick={() => { tap(); setPick(index); }}>{t(`intro.guides.q${index}`)}</button>
        ))}
      </div>
      <div className="answer" role="status" aria-live="polite">
        <p className="kicker"><BookOpen aria-hidden size={14} style={{ verticalAlign: "-2px" }} /> {t("nav.guide")}</p>
        <h3>{t(`intro.guides.t${pick}`)}</h3>
        <p className="muted">{t(`intro.guides.a${pick}`)}</p>
      </div>
    </div>
  );
}

function FormDemo() {
  const { t } = useI18n();
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div className="demo">
      <ul className="paper-form" aria-label={t("intro.forms.paper")}>
        {[0, 1, 2].map((index) => (
          <li key={index}>
            <button type="button" className={`form-row${pick === index ? " is-marked" : ""}`} aria-expanded={pick === index} onClick={() => { tap(); setPick(pick === index ? null : index); }}>
              <span className="form-label">{t(`intro.forms.f${index}`)}</span>
              <span className="form-value">{t(`intro.forms.v${index}`)}</span>
              {pick === index && <span className="form-note">{t(`intro.forms.n${index}`)}</span>}
            </button>
          </li>
        ))}
      </ul>
      <p className="faint"><FileText aria-hidden size={14} style={{ verticalAlign: "-2px" }} /> {pick === null ? t("intro.forms.hint") : t("intro.forms.more")}</p>
    </div>
  );
}

function AskDemo() {
  const { t } = useI18n();
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div className="demo">
      <div className="chat" aria-live="polite">
        {pick === null ? (
          <p className="bubble saath">{t("intro.ai.hello")}</p>
        ) : (
          <>
            <p className="bubble me">{t(`intro.ai.q${pick}`)}</p>
            <p className="bubble saath">{t(`intro.ai.a${pick}`)}</p>
          </>
        )}
      </div>
      <div className="cluster" role="group" aria-label={t("intro.ai.try")}>
        {[0, 1, 2].map((index) => (
          <button key={index} type="button" className="chip" aria-pressed={pick === index} onClick={() => { tap(); setPick(index); }}>{t(`intro.ai.q${index}`)}</button>
        ))}
      </div>
      <p className="faint"><MessageCircle aria-hidden size={14} style={{ verticalAlign: "-2px" }} /> {t("intro.ai.note")}</p>
    </div>
  );
}

const SAMPLE_SPEND = [
  { id: "food", amount: 180 },
  { id: "travel", amount: 60 },
  { id: "phone", amount: 299 },
  { id: "fun", amount: 250 },
];

function MoneyDemo() {
  const { t, code } = useI18n();
  const [logged, setLogged] = useState<string[]>([]);
  const rows = SAMPLE_SPEND.filter((item) => logged.includes(item.id));
  const total = rows.reduce((sum, item) => sum + item.amount, 0);
  const max = Math.max(1, ...rows.map((item) => item.amount));
  return (
    <div className="demo">
      <div className="cluster" role="group" aria-label={t("intro.money.try")}>
        {SAMPLE_SPEND.map((item) => (
          <button
            key={item.id}
            type="button"
            className="chip"
            aria-pressed={logged.includes(item.id)}
            onClick={() => { tap(); setLogged((current) => (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])); }}
          >
            {t(`categories.${item.id}`)} {inr(item.amount, code)}
          </button>
        ))}
      </div>
      <div className="stack-sm" aria-live="polite">
        <div className="row-between">
          <span className="muted">{t("intro.money.total")}</span>
          <strong className="hero-num md">{inr(total, code)}</strong>
        </div>
        {rows.length === 0 ? (
          <p className="faint">{t("intro.money.hint")}</p>
        ) : (
          <ul className="spend">
            {rows.map((item) => (
              <li key={item.id} className="spend-row">
                <div className="row-between"><span>{t(`categories.${item.id}`)}</span><span className="num">{Math.round((item.amount / total) * 100)}%</span></div>
                <div className="bar" aria-hidden><span style={{ width: `${(item.amount / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="faint"><Wallet aria-hidden size={14} style={{ verticalAlign: "-2px" }} /> {t("intro.money.note")}</p>
    </div>
  );
}

const DEMO_TOPICS = ["budgeting", "saving", "borrowing", "investing", "insurance", "scams", "paperwork", "retirement"] as const;

function PersonalDemo() {
  const { t } = useI18n();
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <div className="demo">
      <div className="cluster" role="group" aria-label={t("personal.title")}>
        {DEMO_TOPICS.filter((topic) => (TOPICS as readonly string[]).includes(topic)).map((topic) => (
          <button
            key={topic}
            type="button"
            className="chip"
            aria-pressed={picked.includes(topic)}
            onClick={() => { tap(); setPicked((current) => (current.includes(topic) ? current.filter((id) => id !== topic) : [...current, topic].slice(-3))); }}
          >
            {t(`topics.${topic}`)}
          </button>
        ))}
      </div>
      <p role="status" aria-live="polite" className={picked.length ? undefined : "faint"}>
        {picked.length ? t("intro.personal.result", { topics: picked.map((topic) => t(`topics.${topic}`)).join(", ") }) : t("intro.personal.hint")}
      </p>
    </div>
  );
}

export function Intro({ onJoin, onLogin }: { onJoin: () => void; onLogin: () => void }) {
  const { t } = useI18n();
  const [xp, setXp] = useState(0);
  const [act, setAct] = useState(-1);
  const acts = useMemo(() => ["play", "progress", "guides", "forms", "ai", "money", "stories", "personal"], []);

  return (
    <main className="intro">
      <div className="intro-top navy-scene">
        <Logo size={24} />
        <span className="cluster">
          <LangSwitch />
          <button type="button" className="btn btn-ghost btn-auto" onClick={() => { tap(); onLogin(); }}>{t("auth.login")}</button>
          <ThemeToggle />
        </span>
      </div>

      <section className="intro-hero navy-scene">
        <div className="hero-figure stage">
          <Character look={{ outfit: "kurta", extra: "none", place: "room" }} age={22} size={220} label={t("intro.hero.figure")} />
        </div>
        <div className="stack scene-in">
          <p className="masthead">{t("intro.hero.kicker")}</p>
          <h1>{t("intro.hero.title")}</h1>
          <p className="lead">{t("intro.hero.lead")}</p>
          <a className="btn btn-primary" href="#act-play" onClick={tap}>
            {t("intro.hero.cta")}
            <ArrowDown aria-hidden size={18} />
          </a>
          <p className="faint">{t("intro.hero.note")}</p>
        </div>
      </section>

      <Reveal id="act-play" navy onSeen={() => setAct(0)}>
        <ActHead n="01" title={t("intro.play.title")} lead={t("intro.play.lead")} />
        <PlayEpisode onXp={setXp} />
        <ol className="loop" aria-label={t("intro.play.loopLabel")}>
          {["story", "try", "decide", "outcome", "why", "drill", "xp"].map((step) => <li key={step}>{t(`intro.loop.${step}`)}</li>)}
        </ol>
      </Reveal>

      <Reveal onSeen={() => setAct(1)}>
        <ActHead n="02" title={t("intro.progress.title")} lead={t("intro.progress.lead")} />
        <ProgressDemo xp={xp} />
      </Reveal>

      <Reveal navy onSeen={() => setAct(2)}>
        <ActHead n="03" title={t("intro.guides.title")} lead={t("intro.guides.lead")} />
        <GuideDemo />
      </Reveal>

      <Reveal onSeen={() => setAct(3)}>
        <ActHead n="04" title={t("intro.forms.title")} lead={t("intro.forms.lead")} />
        <FormDemo />
      </Reveal>

      <Reveal navy onSeen={() => setAct(4)}>
        <ActHead n="05" title={t("intro.ai.title")} lead={t("intro.ai.lead")} />
        <AskDemo />
      </Reveal>

      <Reveal onSeen={() => setAct(5)}>
        <ActHead n="06" title={t("intro.money.title")} lead={t("intro.money.lead")} />
        <MoneyDemo />
      </Reveal>

      <Reveal navy onSeen={() => setAct(6)}>
        <ActHead n="07" title={t("intro.stories.title")} lead={t("intro.stories.lead")} />
        <div className="demo">
          <p className="kicker">{t("stories.kind.official")}</p>
          <h3>{t("intro.stories.sample")}</h3>
          <p className="muted">{t("intro.stories.sampleBody")}</p>
          <p className="faint">{t("intro.stories.source")}</p>
        </div>
      </Reveal>

      <Reveal onSeen={() => setAct(7)}>
        <ActHead n="08" title={t("intro.personal.title")} lead={t("intro.personal.lead")} />
        <PersonalDemo />
        <p className="faint"><Share2 aria-hidden size={14} style={{ verticalAlign: "-2px" }} /> {t("intro.personal.share")}</p>
      </Reveal>

      <Reveal id="join" onSeen={() => setAct(8)}>
        <div className="finale navy-scene">
          <h2>{t("intro.cta")}</h2>
          <p className="lead">{t("intro.ctaLead")}</p>
          <button type="button" className="btn btn-primary" onClick={() => { tap(); onJoin(); }}>
            {t("intro.cta")}
            <ArrowRight aria-hidden size={18} />
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => { tap(); onLogin(); }}>{t("auth.haveAccount")}</button>
          <p className="faint">{t("intro.ctaNote")} <Link href="/privacy">{t("profile.privacy")}</Link></p>
        </div>
      </Reveal>
      {/* Where you are in the tour, and the way in, always within reach. */}
      <nav className={`intro-dots${act >= 0 && act < acts.length ? " on" : ""}`} aria-hidden>
        {acts.map((id, index) => <i key={id} className={index === act ? "on" : index < act ? "was" : undefined} />)}
      </nav>
      <div className={`intro-float${act >= 0 && act < acts.length ? " on" : ""}`}>
        <button type="button" className="btn btn-primary" onClick={() => { tap(); onJoin(); }} tabIndex={act >= 0 && act < acts.length ? 0 : -1}>
          {t("intro.cta")}
          <ArrowRight aria-hidden size={18} />
        </button>
      </div>
    </main>
  );
}
