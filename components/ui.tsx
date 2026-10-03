"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight, Award, Briefcase, Building2, CalendarDays, Check, Coins, FileText, Gauge, HeartPulse, IdCard,
  KeyRound, Landmark, ListChecks, LockOpen, PenLine, Percent, PiggyBank, Receipt, Scale, ShieldCheck, Smartphone,
  Split, Sprout, Table2, TrendingUp, Umbrella, Volume2, X, type LucideIcon,
} from "lucide-react";
import type { GlossaryTerm, MiniCheck } from "@/lib/content-types";
import { loadJson } from "@/lib/content-types";
import { asset } from "@/lib/config";
import { pickVoice, playText, tap } from "@/lib/speech";
import { useI18n } from "./providers";

/* One icon set for the whole app. Content files name an icon by a short word. */
const ICONS: Record<string, LucideIcon> = {
  list: ListChecks, scale: Scale, piggy: PiggyBank, percent: Percent, trending: TrendingUp, calendar: CalendarDays,
  split: Split, receipt: Receipt, unlock: LockOpen, gauge: Gauge, file: FileText, phone: Smartphone, key: KeyRound,
  shield: ShieldCheck, briefcase: Briefcase, umbrella: Umbrella, heart: HeartPulse, jar: Coins, landmark: Landmark,
  sprout: Sprout, "arrow-up": ArrowUpRight, building: Building2, id: IdCard, table: Table2, pen: PenLine, award: Award,
};

export function ContentIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? FileText;
  return <Icon aria-hidden size={size} strokeWidth={1.75} />;
}

export function SkywardMark({ size = 36 }: { size?: number }) {
  // The partner logo is printed in grey so the app stays black and white.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset("/skyward-logo.png")} alt="" width={size} height={size} style={{ width: size, height: size, filter: "grayscale(1)" }} />;
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="foot">
      <SkywardMark size={32} />
      <span>{t("common.footer")}</span>
    </footer>
  );
}

/** A bottom sheet for secondary actions. Closes on Escape, on the backdrop, and on the close button. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const id = useId();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  // Rendered at the top of the page so no animated parent can change where "fixed" is measured from.
  return createPortal(
    <>
      <button type="button" className="sheet-backdrop" aria-label={t("common.close")} tabIndex={-1} onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} ref={ref}>
        <div className="sheet-handle" aria-hidden />
        <div className="sheet-head">
          <h2 id={id}>{title}</h2>
          <button type="button" className="icon-btn" aria-label={t("common.close")} onClick={onClose}>
            <X aria-hidden size={20} />
          </button>
        </div>
        {children}
      </div>
    </>,
    document.body,
  );
}

export function Ring({
  value,
  size = 56,
  stroke = 5,
  label,
  spin,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  /** Turns slowly while the amount of work left is not known. */
  spin?: boolean;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <span className={spin ? "ring-wrap spin" : "ring-wrap"} role="img" aria-label={label} style={{ width: size, height: size }}>
      <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children ? <span aria-hidden>{children}</span> : null}
    </span>
  );
}

/** A number that counts up gently. It jumps straight to the value when motion is reduced. */
export function CountUp({ value, format }: { value: number; format: (value: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = from.current;
    const began = performance.now();
    const duration = 700;
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - began) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setShown(start + (value - start) * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      from.current = value;
    };
  }, [value]);

  return <span aria-label={format(value)}><span aria-hidden>{format(Math.round(shown))}</span></span>;
}

/** Reads text aloud with the best voice the phone has. Says so kindly when there is none. */
export function ListenButton({ text, label, primary, compact }: { text: string; label?: string; primary?: boolean; compact?: boolean }) {
  const { t, code } = useI18n();
  const [on, setOn] = useState(false);
  const [missing, setMissing] = useState(false);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => () => stop.current?.(), []);

  async function toggle() {
    tap();
    if (on) {
      stop.current?.();
      setOn(false);
      return;
    }
    const voice = await pickVoice(code);
    if (!voice) {
      setMissing(true);
      return;
    }
    setMissing(false);
    setOn(true);
    stop.current = await playText(text, code, () => setOn(false));
  }

  return (
    <span className="stack-xs" style={{ justifyItems: primary ? "stretch" : "start" }}>
      <button
        type="button"
        className={primary ? "btn btn-primary" : compact ? "listen icon-only" : "listen"}
        aria-pressed={on}
        aria-label={compact ? (on ? t("common.stop") : label ?? t("common.listen")) : undefined}
        onClick={toggle}
      >
        {on ? <span className="wave" aria-hidden><i /><i /><i /><i /></span> : <Volume2 aria-hidden size={18} />}
        {compact ? null : on ? t("common.stop") : label ?? t("common.listen")}
      </button>
      {missing && <span role="status" className="note">{t("common.noVoice")}</span>}
    </span>
  );
}

/** One question with three options. After a pick it shows the best answer and why. */
export function CheckCard({
  check,
  picked,
  onPick,
}: {
  check: MiniCheck;
  picked: number | null;
  onPick: (index: number) => void;
}) {
  const { t, code } = useI18n();
  const answered = picked !== null;
  return (
    <div className="stack-sm">
      <h3>{check.question[code]}</h3>
      <div className="stack-sm" role="group" aria-label={check.question[code]}>
        {check.options.map((option, index) => {
          const best = answered && index === check.answer;
          const mine = answered && index === picked;
          return (
            <button
              key={option.en + index}
              type="button"
              className={`option${best ? " is-best" : ""}${mine && !best ? " is-mine" : ""}${answered && !best && !mine ? " is-dim" : ""}`}
              disabled={answered}
              onClick={() => {
                tap();
                onPick(index);
              }}
            >
              <span className="option-mark" aria-hidden>{best ? <Check className="draw" size={16} strokeWidth={3} /> : null}</span>
              <span>
                {option[code]}
                {best ? <span className="option-tag">{t("home.bestPick")}</span> : null}
                {mine && !best ? <span className="option-tag">{t("home.yourPick")}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
      {answered && (
        <p role="status" className="muted">
          <strong className={picked === check.answer ? "accent-text" : undefined}>
            {picked === check.answer ? t("home.right") : t("home.notQuite")}
          </strong>{" "}
          {check.why[code]}
        </p>
      )}
    </div>
  );
}

export function useGlossary() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [open, setOpen] = useState<GlossaryTerm | null>(null);
  useEffect(() => {
    loadJson<GlossaryTerm[]>("/content/glossary.json").then(setTerms).catch(() => setTerms([]));
  }, []);
  return {
    terms,
    term: open,
    show: (id: string) => setOpen(terms.find((item) => item.id === id) ?? null),
    close: () => setOpen(null),
  };
}

/** Text with [[glossary-id]] markers turned into words you can tap. */
export function TermText({ text, terms, onTerm }: { text: string; terms: GlossaryTerm[]; onTerm: (id: string) => void }) {
  const { code } = useI18n();
  const parts = text.split(/\[\[([a-z0-9-]+)\]\]/g);
  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 0) return <span key={index}>{part}</span>;
        const label = terms.find((item) => item.id === part)?.term[code] ?? part;
        return (
          <button key={index} type="button" className="term" onClick={() => onTerm(part)}>
            {label}
          </button>
        );
      })}
    </>
  );
}

export function GlossarySheet({ term, onClose }: { term: GlossaryTerm | null; onClose: () => void }) {
  const { code } = useI18n();
  if (!term) return null;
  return (
    <Sheet title={term.term[code]} onClose={onClose}>
      <div className="stack-sm">
        <p>{term.definition[code]}</p>
        <ListenButton text={`${term.term[code]}. ${term.definition[code]}`} />
      </div>
    </Sheet>
  );
}

export function Skeleton({ height, width }: { height: number; width?: string }) {
  return <div className="skeleton" style={{ height, width }} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="stack" aria-busy="true">
      <Skeleton height={36} width="55%" />
      <Skeleton height={168} />
      <Skeleton height={96} />
      <Skeleton height={96} />
    </div>
  );
}
