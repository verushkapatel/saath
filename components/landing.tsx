"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, Check, FileText, Globe2, Lock, Mic, ScanLine, ShieldCheck, Sparkles, Wallet, BookOpen, TrendingUp, MessageCircle } from "lucide-react";
import { tap } from "@/lib/speech";
import { Character } from "./character";
import { LangSwitch } from "./lang-switch";
import { Logo, LogoMark, SkywardEmblem } from "./logo";
import { useI18n } from "./providers";
import { LifeScene } from "./life-scene";
import { ThemeToggle } from "./theme-toggle";

/**
 * The landing page, for anyone who has not made an account yet. A calm, cinematic product page:
 * a hero with Verena, a short problem statement, three live product demos, a statement that lights up as you scroll,
 * a grid of what is inside, the four pillars, privacy, and one clear call to action.
 */

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Adds "in" to an element the first time it scrolls into view; children stagger through --i. */
function useReveal<T extends HTMLElement>() {
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
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, seen] as const;
}

function Reveal({ children, className = "", as: Tag = "div", id }: { children: ReactNode; className?: string; as?: "div" | "section" | "header"; id?: string }) {
  const [ref, seen] = useReveal<HTMLDivElement>();
  return (
    <Tag ref={ref as never} id={id} className={`lp-reveal${seen ? " in" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

/** A headline whose words rise into place one after another. */
function SplitWords({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <>
      {text.split(" ").map((word, index) => (
        <span key={index} className="lp-word" style={{ "--d": `${delay + index * 70}ms` } as CSSProperties}>
          {word}{" "}
        </span>
      ))}
    </>
  );
}

/** Runs a step counter while the element is on screen, for the looping demos. */
function useLoop(steps: number, every: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(reduced() ? steps - 1 : 0);
  useEffect(() => {
    if (reduced()) return;
    const node = ref.current;
    let timer: number | undefined;
    let visible = false;
    const tick = () => setStep((value) => (value + 1) % steps);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      window.clearInterval(timer);
      if (visible) timer = window.setInterval(tick, every);
    }, { threshold: 0.3 });
    if (node) observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [steps, every]);
  return [ref, step] as const;
}

/** Follows the pointer with a soft light, for cards. */
function spotlight(event: React.PointerEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--mx", `${event.clientX - box.left}px`);
  event.currentTarget.style.setProperty("--my", `${event.clientY - box.top}px`);
}

function StoryDemo() {
  const { t } = useI18n();
  const [ref, step] = useLoop(4, 1600);
  const picked = step >= 1;
  return (
    <div ref={ref} className="lp-mock lp-story">
      <div className="lp-mock-bar"><span>{t("lp.demo.story.where")}</span><span className="lp-dots"><i /><i /><i /></span></div>
      <div className="lp-story-scene">
        <Character look={{ outfit: "kurta", extra: "none", place: "room" }} age={19} size={96} bare alive />
        <p>{t("lp.demo.story.scene")}</p>
      </div>
      <ul className="lp-options">
        {(["a", "b", "c"] as const).map((key) => (
          <li key={key} className={picked && key === "b" ? "on" : picked ? "dim" : ""}>
            <span className="lp-radio" aria-hidden>{picked && key === "b" ? <Check size={12} strokeWidth={3} /> : null}</span>
            {t(`lp.demo.story.${key}`)}
          </li>
        ))}
      </ul>
      <p className={`lp-outcome${step >= 2 ? " show" : ""}`}><Sparkles size={14} aria-hidden /> {t("lp.demo.story.result")} <b>+30 XP</b></p>
    </div>
  );
}

function AiDemo() {
  const { t } = useI18n();
  const answer = t("lp.demo.ai.a");
  const [ref, step] = useLoop(40, 120);
  const shown = reduced() ? answer.length : Math.min(answer.length, Math.max(0, step - 6) * Math.ceil(answer.length / 26));
  return (
    <div ref={ref} className="lp-mock lp-ai">
      <div className="lp-mock-bar"><span><LogoMark size={14} /> Saath AI</span><span className="lp-live"><i /> {step < 6 ? "…" : "EN"}</span></div>
      <p className="lp-bubble me">{t("lp.demo.ai.q")}</p>
      <div className="lp-bubble ai">
        {step < 6 ? <span className="lp-typing"><i /><i /><i /></span> : <span>{answer.slice(0, shown)}{shown < answer.length && <span className="lp-caret" />}</span>}
      </div>
      <p className={`lp-source${shown >= answer.length ? " show" : ""}`}><BookOpen size={13} aria-hidden /> {t("lp.demo.ai.source")}</p>
      <div className="lp-composer" aria-hidden><span>+</span><span className="lp-composer-field" /><Mic size={14} /></div>
    </div>
  );
}

function MoneyDemo() {
  const { t } = useI18n();
  const [ref, step] = useLoop(5, 1400);
  const rows = [
    { name: t("lp.demo.money.e3"), amount: "+₹28,000", time: "09:02", inflow: true },
    { name: t("lp.demo.money.e1"), amount: "−₹640", time: "18:40" },
    { name: t("lp.demo.money.e2"), amount: "−₹200", time: "20:15" },
  ];
  const safe = [1240, 1240, 1218, 1196, 1196][step];
  return (
    <div ref={ref} className="lp-mock lp-money">
      <div className="lp-mock-bar"><span><Wallet size={13} aria-hidden /> Money Lab</span><span>Oct</span></div>
      <p className="lp-kicker">{t("lp.demo.money.safe")}</p>
      <p className="lp-big">₹{safe.toLocaleString("en-IN")}</p>
      <div className="lp-bar"><i style={{ width: `${62 - step * 3}%` }} /></div>
      <ul className="lp-log">
        {rows.map((row, index) => (
          <li key={row.name} className={step >= index ? "show" : ""}>
            <span className="lp-time">{row.time}</span><span>{row.name}</span><b className={row.inflow ? "in" : ""}>{row.amount}</b>
          </li>
        ))}
      </ul>
      <div className="lp-money-foot">
        <span className="lp-pill warn">{t("lp.demo.money.bill")}</span>
        <span className="lp-goal"><span>{t("lp.demo.money.goal")}</span><span className="lp-ring" style={{ "--p": `${40 + step * 6}%` } as CSSProperties} /></span>
      </div>
    </div>
  );
}

/** The statement that lights up word by word as it scrolls through the screen. */
function Belief() {
  const { t } = useI18n();
  const ref = useRef<HTMLParagraphElement | null>(null);
  const words = t("lp.belief.text").split(" ");
  const [lit, setLit] = useState(reduced() ? words.length : 0);
  useEffect(() => {
    if (reduced()) return;
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
      <p ref={ref} className="lp-belief-text">
        {words.map((word, index) => <span key={index} className={index < lit ? "lit" : ""}>{word} </span>)}
      </p>
    </section>
  );
}

/** Her whole life on one stage: the scene, her age and her outfit change every few seconds, or on tap. */
const REEL = [
  { place: "room", age: 10, outfit: "uniform", extra: "backpack" },
  { place: "cafe", age: 21, outfit: "hoodie", extra: "headphones" },
  { place: "office", age: 27, outfit: "blazer", extra: "watch" },
  { place: "bank", age: 34, outfit: "kurta", extra: "bag" },
  { place: "home", age: 45, outfit: "sari", extra: "earrings" },
  { place: "garden", age: 63, outfit: "shawl", extra: "glasses" },
];
function LifeReel() {
  const { t } = useI18n();
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    const timer = window.setInterval(() => setAt((value) => (value + 1) % REEL.length), 3800);
    return () => window.clearInterval(timer);
  }, []);
  const scene = REEL[at];
  return (
    <section className="lp-reel">
      <Reveal as="header" className="lp-head">
        <p className="lp-label">{t("lp.reel.label")}</p>
        <h2>{t("lp.reel.title")}</h2>
        <p className="lp-sub">{t("lp.reel.lead")}</p>
      </Reveal>
      <Reveal className="lp-reel-frame">
        <div key={scene.place} className="lp-reel-scene"><LifeScene place={scene.place} /></div>
        <div key={`v${at}`} className="lp-reel-actor"><Character look={{ outfit: scene.outfit, extra: scene.extra, place: scene.place }} age={scene.age} size={260} bare alive /></div>
        <p key={`c${at}`} className="lp-reel-caption">{t(`lp.reel.s${at}`)}</p>
        <div className="lp-reel-dots" role="tablist" aria-label={t("lp.reel.label")}>
          {REEL.map((item, index) => <button key={item.place} type="button" role="tab" aria-selected={index === at} aria-label={t(`lp.reel.s${index}`)} className={index === at ? "on" : ""} onClick={() => setAt(index)} />)}
        </div>
      </Reveal>
    </section>
  );
}

export function Landing({ onJoin, onLogin }: { onJoin: () => void; onLogin: () => void }) {
  const { t } = useI18n();
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // The nav turns solid once you scroll, and the hero scene drifts a little slower than the page.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 12);
      if (heroRef.current && !reduced()) heroRef.current.style.setProperty("--py", `${Math.min(y, 900) * 0.18}px`);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const join = () => { tap(); onJoin(); };
  const topics = t("lp.topics").split("|");
  const steps = [
    { key: "step1", demo: <StoryDemo /> },
    { key: "step2", demo: <AiDemo /> },
    { key: "step3", demo: <MoneyDemo /> },
  ];

  return (
    <main className="lp" data-testid="landing">
      <header className={`lp-nav${scrolled ? " solid" : ""}`}>
        <div className="lp-nav-in">
          <a href="#top" className="lp-brand" aria-label="Saath"><Logo size={26} /></a>
          <nav className="lp-links" aria-label="Saath">
            <a href="#how">{t("lp.nav.how")}</a>
            <a href="#features">{t("lp.nav.features")}</a>
            <a href="#privacy">{t("lp.nav.privacy")}</a>
          </nav>
          <div className="lp-actions">
            <LangSwitch />
            <ThemeToggle />
            <button type="button" className="lp-btn ghost" onClick={() => { tap(); onLogin(); }}>{t("auth.login")}</button>
            <button type="button" className="lp-btn primary sm" onClick={join}>{t("lp.nav.start")}</button>
          </div>
        </div>
      </header>

      <section id="top" className="lp-hero" ref={heroRef}>
        <div className="lp-glow" aria-hidden />
        <span className="home-aurora lp-aurora" aria-hidden><i /><i /><i /></span>
        <div className="lp-grid" aria-hidden />
        <div className="lp-hero-copy">
          <p className="lp-badge lp-fade" style={{ "--d": "0ms" } as CSSProperties}><SkywardEmblem size={22} /> {t("lp.hero.badge")}</p>
          <h1>
            <span className="lp-line"><SplitWords text={t("lp.hero.title1")} delay={120} /></span>
            <span className="lp-line lp-muted-line"><SplitWords text={t("lp.hero.title2")} delay={420} /></span>
          </h1>
          <p className="lp-lead lp-fade" style={{ "--d": "700ms" } as CSSProperties}>{t("lp.hero.lead")}</p>
          <div className="lp-cta lp-fade" style={{ "--d": "850ms" } as CSSProperties}>
            <button type="button" className="lp-btn primary" onClick={join} data-testid="intro-make-yours-button">
              {t("lp.hero.cta")} <ArrowRight size={18} aria-hidden />
            </button>
            <a href="#how" className="lp-btn outline">{t("lp.hero.secondary")}</a>
          </div>
          <p className="lp-note lp-fade" style={{ "--d": "1000ms" } as CSSProperties}>{t("lp.hero.note")}</p>
        </div>

        <div className="lp-stage lp-fade" style={{ "--d": "500ms" } as CSSProperties}>
          <div className="lp-stage-frame">
            <LifeScene place="room" />
            <div className="lp-stage-actor"><Character look={{ outfit: "kurta", extra: "none", place: "room" }} age={22} size={300} label={t("lp.hero.figure")} alive bare /></div>
          </div>
          <p className="lp-chip c1"><Wallet size={14} aria-hidden /> {t("lp.hero.chip1")}</p>
          <p className="lp-chip c2"><MessageCircle size={14} aria-hidden /> {t("lp.hero.chip2")}</p>
          <p className="lp-chip c3"><TrendingUp size={14} aria-hidden /> {t("lp.hero.chip3")}</p>
        </div>
      </section>

      <div className="lp-marquee" aria-hidden>
        <div className="lp-marquee-track">
          {[...topics, ...topics].map((topic, index) => <span key={index}>{topic}</span>)}
        </div>
      </div>

      <Reveal as="section" className="lp-problem">
        <p className="lp-label">{t("lp.problem.label")}</p>
        <p className="lp-statement">{t("lp.problem.a")} <span className="lp-ink">{t("lp.problem.hl")}</span></p>
      </Reveal>

      <section id="how" className="lp-how">
        <Reveal as="header" className="lp-head">
          <p className="lp-label">{t("lp.how.label")}</p>
          <h2>{t("lp.how.title")}</h2>
          <p className="lp-sub">{t("lp.how.lead")}</p>
        </Reveal>
        <div className="lp-steps">
          {steps.map((step, index) => (
            <Reveal key={step.key} className={`lp-step${index % 2 ? " flip" : ""}`}>
              <div className="lp-step-copy">
                <p className="lp-tag">{t(`lp.${step.key}.tag`)}</p>
                <h3>{t(`lp.${step.key}.title`)}</h3>
                <p>{t(`lp.${step.key}.body`)}</p>
              </div>
              <div className="lp-step-demo" onPointerMove={spotlight}>{step.demo}</div>
            </Reveal>
          ))}
        </div>
      </section>

      <Belief />

      <LifeReel />

      <section id="features" className="lp-features">
        <Reveal as="header" className="lp-head">
          <p className="lp-label">{t("lp.cap.label")}</p>
          <h2>{t("lp.cap.title")}</h2>
        </Reveal>
        <div className="lp-bento">
          <Reveal className="lp-card wide" >
            <div className="lp-card-in" onPointerMove={spotlight}>
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
            <div className="lp-card-in" onPointerMove={spotlight}>
              <div className="lp-ages" aria-hidden>
                {[{ age: 10, outfit: "uniform" }, { age: 21, outfit: "kurta" }, { age: 38, outfit: "blazer" }, { age: 65, outfit: "suit", extra: "glasses" }].map((v) => (
                  <Character key={v.age} look={{ outfit: v.outfit, extra: v.extra ?? "none", place: "room" }} age={v.age} size={70} bare />
                ))}
              </div>
              <h3><TrendingUp size={18} aria-hidden /> {t("lp.cap.grow.title")}</h3>
              <p>{t("lp.cap.grow.body")}</p>
            </div>
          </Reveal>
          <Reveal className="lp-card">
            <div className="lp-card-in" onPointerMove={spotlight}>
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
            <div className="lp-card-in" onPointerMove={spotlight}>
              <div className="lp-langs" aria-hidden><span>English</span><span>हिंदी</span><span>मराठी</span><span className="mic"><Mic size={14} /></span></div>
              <h3><Globe2 size={18} aria-hidden /> {t("lp.cap.lang.title")}</h3>
              <p>{t("lp.cap.lang.body")}</p>
            </div>
          </Reveal>
          <Reveal className="lp-card">
            <div className="lp-card-in" onPointerMove={spotlight}>
              <ol className="lp-flow" aria-hidden>
                {["KYC", "Account", "Debit card", "Insurance", "Claim"].map((item, index) => <li key={item} style={{ "--i": index } as CSSProperties}>{item}</li>)}
              </ol>
              <h3><BookOpen size={18} aria-hidden /> {t("lp.cap.guides.title")}</h3>
              <p>{t("lp.cap.guides.body")}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="lp-pillars">
        <Reveal as="header" className="lp-head">
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
          <div>
            <p className="lp-label">{t("lp.trust.label")}</p>
            <h2>{t("lp.trust.title")}</h2>
            <p className="lp-sub">{t("lp.trust.lead")}</p>
          </div>
          <ul>
            <li><Lock size={18} aria-hidden /> {t("lp.trust.t1")}</li>
            <li><ScanLine size={18} aria-hidden /> {t("lp.trust.t2")}</li>
            <li><ShieldCheck size={18} aria-hidden /> {t("lp.trust.t3")}</li>
          </ul>
        </Reveal>
      </section>

      <section className="lp-final">
        <Reveal className="lp-final-in">
          <span className="lp-final-mark" aria-hidden><LogoMark size={44} /></span>
          <p className="lp-label">{t("lp.final.label")}</p>
          <h2>{t("lp.final.title")}</h2>
          <div className="lp-cta center">
            <button type="button" className="lp-btn primary" onClick={join}>{t("lp.hero.cta")} <ArrowRight size={18} aria-hidden /></button>
            <button type="button" className="lp-btn outline" onClick={() => { tap(); onLogin(); }}>{t("lp.final.login")}</button>
          </div>
          <p className="lp-note">{t("lp.hero.note")}</p>
        </Reveal>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-in">
          <div className="lp-footer-brand">
            <Logo size={24} />
            <p>{t("lp.footer.tag")}</p>
          </div>
          <div className="lp-footer-cols">
            <div>
              <p>{t("lp.footer.product")}</p>
              <a href="#how">{t("lp.footer.story")}</a>
              <a href="#how">{t("lp.footer.ai")}</a>
              <a href="#features">{t("lp.footer.guides")}</a>
              <a href="#features">{t("lp.footer.forms")}</a>
              <a href="#how">{t("lp.footer.money")}</a>
            </div>
            <div>
              <p>{t("lp.footer.project")}</p>
              <Link href="/about">{t("lp.footer.about")}</Link>
              <Link href="/privacy">{t("lp.footer.privacy")}</Link>
            </div>
            <div>
              <p>{t("lp.footer.languages")}</p>
              <span>English</span><span>हिंदी</span><span>मराठी</span>
            </div>
          </div>
        </div>
        <div className="lp-footer-base">
          <span>© 2026 The Skyward Project · Verushka Patel</span>
          <span>{t("lp.footer.rights")}</span>
        </div>
        <p className="lp-wordmark" aria-hidden>saath</p>
      </footer>
    </main>
  );
}
