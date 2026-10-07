"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, ArrowUp, BookOpen, Check, FileText, Globe2, Lock, Mic, Paperclip, Plus, ScanLine, ShieldCheck, Sparkles, Wallet, Menu, X } from "lucide-react";
import { tap } from "@/lib/speech";
import { Character } from "./character";
import { LangSwitch } from "./lang-switch";
import { Logo, LogoMark, SkywardEmblem } from "./logo";
import { useI18n } from "./providers";
import { ThemeToggle } from "./theme-toggle";

/**
 * The landing page, for anyone who has not made an account yet. A calm, cinematic product page:
 * a hero over drawn city light trails with Saath AI typing a real question, the problem in one sentence,
 * how Saath works in three layers with live cards, a statement that lights up as you scroll, what is inside,
 * privacy, and one clear call to action.
 */

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ───────── Light trails: a night road drawn on a canvas, with traffic streaking past ───────── */

type Streak = { lane: number; p: number; len: number; speed: number; warm: boolean; width: number };

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, streaks: Streak[], opts: { vx: number; vy: number; tilt: number; poles: boolean; stars: number[][] }) {
  const { vx, vy } = opts;
  ctx.globalCompositeOperation = "source-over";
  const sky = ctx.createLinearGradient(0, 0, 0, vy);
  sky.addColorStop(0, "#1631b5");
  sky.addColorStop(0.55, "#0b1660");
  sky.addColorStop(1, "#05060c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, vy + 1);
  ctx.fillStyle = "#030305";
  ctx.fillRect(0, vy, w, h - vy);
  for (const [x, y, a] of opts.stars) {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x * w, y * vy * 0.8, 1, 1);
  }
  const glow = ctx.createRadialGradient(vx, vy, 0, vx, vy, w * 0.45);
  glow.addColorStop(0, "rgba(255,170,120,0.35)");
  glow.addColorStop(1, "rgba(255,170,120,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  if (opts.poles) {
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = Math.max(2, w * 0.004);
    for (const [px, top] of [[0.13, 0.12], [0.28, 0.3], [0.86, 0.22]]) {
      const x = px * w;
      ctx.beginPath(); ctx.moveTo(x, top * h); ctx.lineTo(x, vy + 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - w * 0.03, top * h + 10); ctx.lineTo(x + w * 0.03, top * h + 10); ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath(); ctx.moveTo(0, 0.2 * h); ctx.quadraticCurveTo(0.2 * w, 0.27 * h, 0.28 * w, 0.31 * h); ctx.stroke();
  }
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const s of streaks) {
    const headP = Math.min(1.2, s.p);
    const tailP = Math.max(0, s.p - s.len);
    if (headP <= 0) continue;
    const bottomX = vx + s.lane * w * 1.1 + opts.tilt * w;
    const at = (p: number) => {
      const k = p * p;
      return [vx + (bottomX - vx) * k, vy + (h * 1.05 - vy) * k];
    };
    const [x1, y1] = at(tailP);
    const [x2, y2] = at(headP);
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    const colour = s.warm ? "255,64,48" : "255,244,226";
    grad.addColorStop(0, `rgba(${colour},0)`);
    grad.addColorStop(1, `rgba(${colour},${s.warm ? 0.85 : 0.9})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(0.6, s.width * headP * headP * 3);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
  const shade = ctx.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, "rgba(0,0,0,0.15)");
  shade.addColorStop(0.7, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
}

function makeStreaks(seed: number, count: number): Streak[] {
  const r = rng(seed);
  return Array.from({ length: count }, () => {
    const warm = r() > 0.48;
    const lane = warm ? 0.08 + r() * 0.75 : -(0.08 + r() * 0.75);
    return { lane, p: r() * 1.2, len: 0.25 + r() * 0.55, speed: 0.08 + r() * 0.14, warm, width: 0.6 + r() * 1.6 };
  });
}

/** The night road. Animated in the hero; drawn once as the backdrop of the product cards. */
function Trails({ seed = 7, animate = false, vy = 0.56, vx = 0.5, tilt = 0, poles = false }: { seed?: number; animate?: boolean; vy?: number; vx?: number; tilt?: number; poles?: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const r = rng(seed * 31);
    const stars = Array.from({ length: 70 }, () => [r(), r(), 0.15 + r() * 0.5]);
    const streaks = makeStreaks(seed, animate ? 150 : 110);
    let frame = 0;
    let last = performance.now();
    let visible = true;
    const size = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(box.width * dpr));
      canvas.height = Math.max(1, Math.round(box.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return box;
    };
    let box = size();
    const paint = () => drawScene(ctx, box.width, box.height, streaks, { vx: box.width * vx, vy: box.height * vy, tilt, poles, stars });
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (const s of streaks) {
        s.p += s.speed * dt * (s.warm ? 0.8 : 1.2);
        if (s.p - s.len > 1.2) s.p = 0;
      }
      paint();
      if (visible) frame = requestAnimationFrame(loop);
    };
    paint();
    const onResize = () => { box = size(); paint(); };
    window.addEventListener("resize", onResize);
    let observer: IntersectionObserver | undefined;
    if (animate && !reduced()) {
      observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        cancelAnimationFrame(frame);
        if (visible) { last = performance.now(); frame = requestAnimationFrame(loop); }
      });
      observer.observe(canvas);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [seed, animate, vx, vy, tilt, poles]);
  return <canvas ref={ref} className="lp-trails" aria-hidden />;
}

/* ───────── Scroll reveal and looping demos ───────── */

function useSeen<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return setSeen(true);
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setSeen(true);
        observer.disconnect();
      }
    }, { threshold, rootMargin: "0px 0px -8% 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

function Reveal({ children, className = "", as: Tag = "div", id }: { children: ReactNode; className?: string; as?: "div" | "section" | "header"; id?: string }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  return <Tag ref={ref as never} id={id} className={`lp-reveal${seen ? " in" : ""} ${className}`}>{children}</Tag>;
}

function useLoop(steps: number, every: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduced()) return setStep(steps - 1);
    const node = ref.current;
    let timer: number | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (entry.isIntersecting) timer = window.setInterval(() => setStep((value) => (value + 1) % steps), every);
    }, { threshold: 0.3 });
    if (node) observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [steps, every]);
  return [ref, step] as const;
}

/** The hero's Saath AI box, typing one real question after another. */
function Composer() {
  const { t } = useI18n();
  const prompts = [t("lp.hero.prompt1"), t("lp.hero.prompt2"), t("lp.hero.prompt3")];
  const [index, setIndex] = useState(0);
  const [chars, setChars] = useState(reduced() ? prompts[0].length : 0);
  useEffect(() => {
    if (reduced()) return;
    const text = prompts[index];
    const timer = window.setTimeout(() => {
      if (chars < text.length) setChars(chars + Math.max(1, Math.round(text.length / 70)));
      else { setChars(0); setIndex((index + 1) % prompts.length); }
    }, chars >= text.length ? 2600 : 34);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars, index]);
  const text = prompts[index].slice(0, chars);
  return (
    <div className="lp-composer-hero" aria-hidden>
      <p className="lp-typed">{text}<span className="lp-caret" /></p>
      <div className="lp-composer-bar">
        <span><Plus size={17} /></span>
        <span><Paperclip size={15} /> {t("lp.hero.attach")}</span>
        <span><Mic size={15} /> {t("lp.hero.voice")}</span>
        <span className="hide-sm"><BookOpen size={15} /> {t("lp.hero.cite")}</span>
        <span className="lp-send"><ArrowUp size={18} /></span>
      </div>
    </div>
  );
}

/** Card 1: Saath AI reading a question and splitting it across the app. */
function UnderstandCard() {
  const { t } = useI18n();
  const [ref, step] = useLoop(6, 900);
  const parts = [
    { tag: "@Story", cls: "c-blue", text: t("lp.m1.story") },
    { tag: "@Guides", cls: "c-violet", text: t("lp.m1.guide") },
    { tag: "@MoneyLab", cls: "c-amber", text: t("lp.m1.money") },
    { tag: "@Forms", cls: "c-green", text: t("lp.m1.forms") },
  ];
  return (
    <div ref={ref} className="lp-agent">
      <p className="lp-agent-head"><LogoMark size={12} /> SAATH AI</p>
      <p className="lp-agent-ask">{t("lp.m1.ask")}</p>
      <div className="lp-agent-reply">
        <span className="lp-agent-dot"><LogoMark size={10} /></span>
        <div>
          <p>{t("lp.m1.reply")}</p>
          <ul>
            {parts.map((part, index) => (
              <li key={part.tag} className={step > index ? "show" : ""}><b className={part.cls}>{part.tag}</b> {part.text}</li>
            ))}
          </ul>
          <p className={`lp-agent-foot${step >= 5 ? " show" : ""}`}>{t("lp.m1.dispatch")}</p>
        </div>
      </div>
    </div>
  );
}

/** Card 2: every part of Saath working on its piece, finishing one after another. */
function WorkersCard() {
  const { t } = useI18n();
  const [ref, step] = useLoop(5, 1500);
  const rows = [
    { tag: "@Story", cls: "c-blue", text: t("lp.m2.story"), at: 1 },
    { tag: "@Guides", cls: "c-violet", text: t("lp.m2.guide"), at: 2 },
    { tag: "@MoneyLab", cls: "c-amber", text: t("lp.m2.money"), at: 4 },
    { tag: "@Forms", cls: "c-green", text: t("lp.m2.forms"), at: 9 },
  ];
  return (
    <div ref={ref} className="lp-agent">
      <p className="lp-agent-head row"><span>{t("lp.m2.head").toUpperCase()}</span><span className="lp-dots-live"><i /><i /><i /></span></p>
      <ul className="lp-workers">
        {rows.map((row, index) => {
          const state = step >= row.at ? "done" : index === rows.findIndex((r) => step < r.at) ? "running" : "waiting";
          return (
            <li key={row.tag}>
              <p><b className={row.cls}>{row.tag}</b> <span className={`lp-status ${state}`}>{t(`lp.status.${state}`)}</span>{state === "running" && <span className="lp-run">•••</span>}</p>
              <p className="lp-muted">{row.text}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Card 3: the privacy check that runs before an answer reaches you. */
function PrivacyCard() {
  const { t } = useI18n();
  const [ref, step] = useLoop(6, 900);
  return (
    <div ref={ref} className="lp-agent">
      <p className="lp-agent-head row green"><span><ShieldCheck size={14} /> {t("lp.m3.head").toUpperCase()}</span><span className="lp-faint">#1847</span></p>
      <p className="lp-section">{t("lp.m3.checks").toUpperCase()}</p>
      <ul className="lp-checks">
        {["c1", "c2", "c3"].map((key) => <li key={key}><Check size={15} strokeWidth={3} /> {t(`lp.m3.${key}`)}</li>)}
      </ul>
      <p className="lp-section">{t("lp.m3.log").toUpperCase()}</p>
      <ul className="lp-logs">
        {["e1", "e2", "e3", "e4"].map((key, index) => (
          <li key={key} className={step > index ? "show" : ""}><span>00:0{index * 2}</span> {t(`lp.m3.${key}`)}</li>
        ))}
      </ul>
      <p className="lp-section">{t("lp.m3.out").toUpperCase()}</p>
      <p className="lp-outs">{["o1", "o2", "o3"].map((key) => <span key={key}><i /> {t(`lp.m3.${key}`)}</span>)}</p>
    </div>
  );
}

function Belief() {
  const { t } = useI18n();
  const ref = useRef<HTMLParagraphElement | null>(null);
  const words = t("lp.belief.text").split(" ");
  const [lit, setLit] = useState(0);
  useEffect(() => {
    if (reduced()) return setLit(words.length);
    let frame = 0;
    const update = () => {
      frame = 0;
      const node = ref.current;
      if (!node) return;
      const box = node.getBoundingClientRect();
      const progress = (window.innerHeight * 0.85 - box.top) / (box.height + window.innerHeight * 0.45);
      setLit(Math.round(Math.min(1, Math.max(0, progress)) * words.length));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [words.length]);
  return (
    <section className="lp-belief">
      <p className="lp-label">{t("lp.belief.label")}</p>
      <p ref={ref} className="lp-belief-text">{words.map((word, index) => <span key={index} className={index < lit ? "lit" : ""}>{word} </span>)}</p>
    </section>
  );
}

export function Landing({ onJoin, onLogin }: { onJoin: () => void; onLogin: () => void }) {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; setScrolled(window.scrollY > 12); };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const join = () => { tap(); onJoin(); };
  const login = () => { tap(); onLogin(); };
  const layers = [
    { key: "l1", card: <UnderstandCard />, seed: 3, tilt: -0.15, vx: 0.75 },
    { key: "l2", card: <WorkersCard />, seed: 11, tilt: 0.2, vx: 0.2 },
    { key: "l3", card: <PrivacyCard />, seed: 23, tilt: -0.3, vx: 0.6 },
  ];

  return (
    <main className="lp" data-testid="landing">
      <header className={`lp-nav${scrolled ? " solid" : ""}${menu ? " open" : ""}`}>
        <div className="lp-nav-in">
          <a href="#top" className="lp-brand" aria-label="Saath"><Logo size={24} /></a>
          <nav className="lp-links" aria-label="Saath">
            <a href="#how">{t("lp.nav.how")}</a>
            <a href="#features">{t("lp.nav.features")}</a>
            <a href="#privacy">{t("lp.nav.privacy")}</a>
          </nav>
          <div className="lp-actions">
            <LangSwitch />
            <ThemeToggle />
            <button type="button" className="lp-btn ghost hide-sm" onClick={login}>{t("auth.login")}</button>
            <button type="button" className="lp-btn blue sm hide-sm" onClick={join}>{t("lp.nav.start")}</button>
            <button type="button" className="lp-burger" aria-expanded={menu} aria-label="Menu" onClick={() => { tap(); setMenu(!menu); }}>{menu ? <X size={24} /> : <Menu size={24} />}</button>
          </div>
        </div>
        {menu && (
          <div className="lp-sheet" onClick={() => setMenu(false)}>
            <a href="#how">{t("lp.nav.how")}</a>
            <a href="#features">{t("lp.nav.features")}</a>
            <a href="#privacy">{t("lp.nav.privacy")}</a>
            <button type="button" className="lp-btn outline" onClick={login}>{t("auth.login")}</button>
            <button type="button" className="lp-btn blue" onClick={join}>{t("lp.nav.start")}</button>
          </div>
        )}
      </header>

      <section id="top" className="lp-hero">
        <Trails seed={7} animate poles vy={0.6} />
        <div className="lp-hero-in">
          <p className="lp-label lp-fade" style={{ "--d": "100ms" } as CSSProperties}>{t("lp.hero.kicker")}</p>
          <h1>
            <span className="lp-line lp-fade" style={{ "--d": "220ms" } as CSSProperties}>{t("lp.hero.title1")}</span>
            <span className="lp-line lp-fade" style={{ "--d": "420ms" } as CSSProperties}>{t("lp.hero.title2")}</span>
          </h1>
          <p className="lp-lead lp-fade" style={{ "--d": "620ms" } as CSSProperties}>{t("lp.hero.lead")}</p>
          <div className="lp-cta center lp-fade" style={{ "--d": "780ms" } as CSSProperties}>
            <button type="button" className="lp-btn white" onClick={join} data-testid="intro-make-yours-button">{t("lp.hero.cta")}</button>
            <a href="#how" className="lp-btn glass">{t("lp.hero.secondary")}</a>
          </div>
          <div className="lp-fade lp-composer-wrap" style={{ "--d": "950ms" } as CSSProperties}><Composer /></div>
          <p className="lp-badge lp-fade" style={{ "--d": "1100ms" } as CSSProperties}><SkywardEmblem size={20} /> {t("lp.hero.badge")}</p>
        </div>
      </section>

      <Reveal as="section" className="lp-problem">
        <p className="lp-label">{t("lp.problem.label")}</p>
        <p className="lp-statement">{t("lp.problem.a")} <mark>{t("lp.problem.hl")}</mark></p>
      </Reveal>

      <section id="how" className="lp-how">
        <Reveal as="header" className="lp-head left">
          <p className="lp-label">{t("lp.how.label")}</p>
          <h2>{t("lp.how.title2")}</h2>
          <p className="lp-sub">{t("lp.how.lead2")}</p>
          <a href="#layer-l1" className="lp-btn outline">{t("lp.how.action")} <ArrowRight size={18} aria-hidden /></a>
        </Reveal>
        <div className="lp-layers">
          {layers.map((layer) => (
            <Reveal key={layer.key} id={`layer-${layer.key}`} className="lp-layer">
              <div className="lp-panel">
                <Trails seed={layer.seed} tilt={layer.tilt} vx={layer.vx} vy={0.18} />
                <div className="lp-panel-card">{layer.card}</div>
              </div>
              <h3>{t(`lp.${layer.key}.title`)}</h3>
              <p>{t(`lp.${layer.key}.body`)}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <Belief />

      <section className="lp-story">
        <Reveal className="lp-story-in">
          <div className="lp-story-copy">
            <p className="lp-label">{t("lp.step1.tag")}</p>
            <h2>{t("lp.step1.title")}</h2>
            <p className="lp-sub">{t("lp.step1.body")}</p>
          </div>
          <div className="lp-ages" aria-hidden>
            {[{ age: 10, outfit: "uniform" }, { age: 21, outfit: "kurta" }, { age: 30, outfit: "shirt" }, { age: 44, outfit: "blazer" }, { age: 65, outfit: "suit", extra: "glasses" }].map((v, index) => (
              <div key={v.age} style={{ "--i": index } as CSSProperties}>
                <Character look={{ outfit: v.outfit, extra: v.extra ?? "none", place: "room" }} age={v.age} size={110} bare />
                <span>{v.age}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="features" className="lp-features">
        <Reveal as="header" className="lp-head left">
          <p className="lp-label">{t("lp.cap.label")}</p>
          <h2>{t("lp.cap.title")}</h2>
        </Reveal>
        <div className="lp-bento">
          <Reveal className="lp-card wide">
            <div className="lp-card-in">
              <div className="lp-form-mock" aria-hidden>
                <div className="lp-form-row"><span>Account holder</span><b>Riya Kulkarni</b></div>
                <div className="lp-form-row hl"><span>{t("lp.cap.forms.field")}</span><b>Meera Kulkarni · Mother</b></div>
                <div className="lp-form-tip"><ScanLine size={14} /> {t("lp.cap.forms.tip")}</div>
                <div className="lp-form-row"><span>PAN</span><b>ABCDE••••F</b></div>
              </div>
              <h3><FileText size={18} aria-hidden /> {t("lp.cap.forms.title")}</h3>
              <p>{t("lp.cap.forms.body")}</p>
            </div>
          </Reveal>
          <Reveal className="lp-card">
            <div className="lp-card-in">
              <div className="lp-paper" aria-hidden>
                <div className="lp-paper-head"><b>Riya Kulkarni</b><span>Accounts trainee</span></div>
                <i /><i /><i className="s" /><i /><i className="s" />
                <small>Made by Saath AI</small>
              </div>
              <h3><Sparkles size={18} aria-hidden /> {t("lp.cap.resume.title")}</h3>
              <p>{t("lp.cap.resume.body")}</p>
            </div>
          </Reveal>
          <Reveal className="lp-card">
            <div className="lp-card-in">
              <div className="lp-langs" aria-hidden><span>English</span><span>हिंदी</span><span>मराठी</span><span className="mic"><Mic size={14} /></span></div>
              <h3><Globe2 size={18} aria-hidden /> {t("lp.cap.lang.title")}</h3>
              <p>{t("lp.cap.lang.body")}</p>
            </div>
          </Reveal>
          <Reveal className="lp-card">
            <div className="lp-card-in">
              <ol className="lp-flow" aria-hidden>
                {["KYC", "Account", "Debit card", "Insurance", "Claim"].map((item, index) => <li key={item} style={{ "--i": index } as CSSProperties}>{item}</li>)}
              </ol>
              <h3><BookOpen size={18} aria-hidden /> {t("lp.cap.guides.title")}</h3>
              <p>{t("lp.cap.guides.body")}</p>
            </div>
          </Reveal>
          <Reveal className="lp-card">
            <div className="lp-card-in">
              <div className="lp-mini-money" aria-hidden>
                <p className="lp-section">{t("lp.demo.money.safe").toUpperCase()}</p>
                <p className="lp-big">₹1,196</p>
                <div className="lp-bar"><i style={{ width: "58%" }} /></div>
              </div>
              <h3><Wallet size={18} aria-hidden /> {t("lp.step3.title")}</h3>
              <p>{t("lp.step3.body")}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="lp-pillars">
        <Reveal as="header" className="lp-head left">
          <p className="lp-label">{t("lp.pillars.label")}</p>
          <h2>{t("lp.pillars.title")}</h2>
        </Reveal>
        <div className="lp-pillar-row">
          {[1, 2, 3, 4].map((n) => (
            <Reveal key={n} className="lp-pillar">
              <span className="lp-num">0{n}</span>
              <h3>{t(`lp.p${n}.title`)}</h3>
              <p>{t(`lp.p${n}.body`)}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="privacy" className="lp-trust">
        <Reveal className="lp-trust-in">
          <p className="lp-label">{t("lp.trust.label")}</p>
          <h2>{t("lp.trust.title")}</h2>
          <p className="lp-sub">{t("lp.trust.lead")}</p>
          <ul className="lp-tags">{t("lp.trust.tags").split("|").map((tag) => <li key={tag}>{tag}</li>)}</ul>
          <ul className="lp-trust-list">
            <li><Lock size={18} aria-hidden /> {t("lp.trust.t1")}</li>
            <li><ScanLine size={18} aria-hidden /> {t("lp.trust.t2")}</li>
            <li><ShieldCheck size={18} aria-hidden /> {t("lp.trust.t3")}</li>
          </ul>
          <div className="lp-cta">
            <button type="button" className="lp-btn white" onClick={join}>{t("lp.hero.cta")}</button>
            <button type="button" className="lp-btn outline" onClick={login}>{t("lp.final.login")}</button>
          </div>
        </Reveal>
      </section>

      <div className="lp-dotband" aria-hidden />

      <section className="lp-final">
        <Reveal className="lp-final-in">
          <p className="lp-label">{t("lp.final.label")}</p>
          <h2>{t("lp.final.title2")}</h2>
          <div className="lp-cta stack">
            <button type="button" className="lp-btn blue xl" onClick={join}>{t("lp.hero.cta")}</button>
            <button type="button" className="lp-btn outline xl" onClick={login}>{t("lp.final.login")}</button>
          </div>
          <p className="lp-note">{t("lp.hero.note")}</p>
        </Reveal>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-in">
          <div className="lp-footer-brand">
            <p className="lp-footer-logo"><LogoMark size={30} /> <span>saath</span></p>
            <p>{t("lp.footer.tag")}</p>
            <p className="lp-footer-by"><SkywardEmblem size={30} /> {t("lp.hero.badge")}</p>
          </div>
          <div className="lp-footer-cols">
            <div>
              <p>{t("lp.footer.product")}</p>
              <a href="#how">{t("lp.footer.story")}</a>
              <a href="#how">{t("lp.footer.ai")}</a>
              <a href="#features">{t("lp.footer.guides")}</a>
              <a href="#features">{t("lp.footer.forms")}</a>
              <a href="#features">{t("lp.footer.money")}</a>
            </div>
            <div>
              <p>{t("lp.footer.project")}</p>
              <Link href="/about">{t("lp.footer.about")}</Link>
              <Link href="/privacy">{t("lp.footer.privacy")}</Link>
              <span>English · हिंदी · मराठी</span>
            </div>
          </div>
        </div>
        <div className="lp-footer-base">
          <span>© 2026 The Skyward Project · Verushka Patel</span>
          <span>{t("lp.footer.rights")}</span>
        </div>
      </footer>
    </main>
  );
}
