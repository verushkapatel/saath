"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Award, Copy, Link2, Share2, Sparkles, X } from "lucide-react";
import { asset } from "@/lib/config";
import { levelFor } from "@/lib/progress";
import { postcardImage } from "@/lib/share-image";
import { shareText, tap } from "@/lib/speech";
import { changes } from "@/lib/verena";
import { useApp, type Celebration } from "./app-state";
import { Character } from "./character";
import { rewardName } from "./reward-sheet";
import { useI18n } from "./providers";
import { pageUrl } from "./share-button";

/** Counts from one number to another over a short time, easing out. */
function useCount(from: number, to: number, run: boolean, ms = 1100): number {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (!run) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from === to) {
      setValue(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [from, to, run, ms]);
  return value;
}

/** Small paper pieces that fall once. Ink, grey and navy only. */
function Burst() {
  const pieces = useMemo(
    () => Array.from({ length: 26 }, (_, index) => ({
      x: (index * 37) % 100,
      d: 0.6 + ((index * 13) % 10) / 10,
      r: (index * 47) % 360,
      c: index % 3,
      delay: ((index * 7) % 10) / 25,
    })),
    [],
  );
  return (
    <div className="burst" aria-hidden>
      {pieces.map((piece, index) => (
        <i
          key={index}
          className={`burst-bit c${piece.c}`}
          style={{ left: `${piece.x}%`, animationDuration: `${1.4 + piece.d}s`, animationDelay: `${piece.delay}s`, ["--r" as string]: `${piece.r}deg` }}
        />
      ))}
    </div>
  );
}

function useTitle(item: Celebration): string {
  const { code } = useI18n();
  const app = useApp();
  if (item.kind === "lesson") return app.lessons.find((lesson) => lesson.id === item.title)?.title[code] ?? item.title;
  if (item.kind === "chapter") return app.journey?.episodes.find((episode) => episode.id === item.title)?.title[code] ?? item.title;
  return item.title;
}

/**
 * The moment after something is finished, in three beats:
 *   1. XP: the number counts up and the level bar fills.
 *   2. Verena: the old Verena steps aside and the new one appears, with what changed in words.
 *   3. Postcard: the new Verena on a card, ready to share as a picture or a link.
 */
export function Celebrate() {
  const { t } = useI18n();
  const app = useApp();
  const item = app.celebration;
  const [beat, setBeat] = useState<0 | 1 | 2>(0);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const host = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setBeat(0);
    setNote(null);
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const gained = item ? Math.max(0, item.xpAfter - item.xpBefore) : 0;
  const shown = useCount(0, gained, Boolean(item) && beat === 0);
  const before = levelFor(item?.xpBefore ?? 0);
  const after = levelFor(item?.xpAfter ?? 0);
  const levelUp = after.level > before.level;
  const title = useTitle(item ?? { id: 0, kind: "walk", title: "", path: "/", xpBefore: 0, xpAfter: 0, before: app.verena, after: app.verena });

  if (!item) return null;

  function finish() {
    tap();
    if (app.fresh.length) app.clearFresh();
    app.endCelebration();
  }

  // The age is already the heading, so it is not repeated in the list.
  const what = changes(item.before, item.after).filter((change) => change.key !== "verena.age");
  const outfitName = (id: string) => t(`verena.outfits.${id}`);
  const extraName = (id: string) => t(`verena.extras.${id}`);
  const placeName = (id: string) => t(`rewards.place.${id}`);
  const lines = what.map((change) =>
    t(change.key, {
      ...change.values,
      outfit: change.values.outfit ? outfitName(String(change.values.outfit)) : "",
      extra: change.values.extra ? extraName(String(change.values.extra)) : "",
      place: change.values.place ? placeName(String(change.values.place)) : "",
    }),
  );
  const step = item.after.step;
  const kicker = t("celebrate.postcardKicker", { n: step, total: app.totalSteps });
  const stats = [t("prog.level", { level: after.level }), `${item.xpAfter} XP`, app.streak.count ? t("home.streak", { count: app.streak.count }) : ""].filter(Boolean).join(" · ");
  const shareLine = t("celebrate.shareLine", { title, age: item.after.age });

  async function sharePicture() {
    tap();
    setBusy(true);
    setNote(null);
    try {
      const style = getComputedStyle(document.body);
      const blob = await postcardImage(
        {
          kicker,
          title: t("celebrate.postcardTitle", { age: item!.after.age }),
          range: title,
          lesson: lines[0] ?? t("celebrate.same"),
          stats,
          credit: pageUrl(item!.path).replace(/^https?:\/\//, ""),
          font: style.fontFamily,
          headFont: style.fontFamily,
          emblem: asset("/skyward-logo.png"),
        },
        host.current?.querySelector("svg") ?? null,
      );
      if (!blob) throw new Error("canvas");
      const file = new File([blob], `saath-verena-${step}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Saath", text: `${shareLine}\n${pageUrl(item!.path)}` });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNote(t("share.saved"));
      }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") setNote(t("share.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function shareLink() {
    tap();
    const result = await shareText("Saath", `${shareLine}\n${pageUrl(item!.path)}`);
    setNote(result === "copied" ? t("common.copied") : result === "shared" ? null : t("share.failed"));
  }

  return createPortal(
    <div className="celebrate" role="dialog" aria-modal="true" aria-label={t("celebrate.label")} data-testid="celebrate">
      <button ref={closeRef} type="button" className="celebrate-close" aria-label={t("common.close")} onClick={finish}><X aria-hidden size={22} /></button>
      <div className="celebrate-dots" aria-hidden>{[0, 1, 2].map((dot) => <span key={dot} className={dot <= beat ? "on" : ""} />)}</div>

      {beat === 0 && (
        <section className="celebrate-beat" key="xp">
          <Burst />
          <p className="celebrate-kicker">{t("celebrate.done")}</p>
          <h2 className="celebrate-title">{title}</h2>
          <p className="xp-big" aria-live="polite"><span>+{shown}</span> XP</p>
          <div className="xp-level">
            <span>{t("prog.level", { level: after.level })}</span>
            <span className="num">{item.xpAfter} XP</span>
          </div>
          <div className="xp-track" aria-hidden>
            <span className="xp-fill" style={{ ["--from" as string]: `${levelUp ? 0 : before.ratio * 100}%`, ["--to" as string]: `${Math.max(3, after.ratio * 100)}%` }} />
          </div>
          {levelUp && <p className="level-up"><Sparkles aria-hidden size={18} /> {t("celebrate.levelUp", { level: after.level })}</p>}
          <button type="button" className="btn btn-primary celebrate-next" onClick={() => { tap(); setBeat(1); }} data-testid="celebrate-next">
            {t("celebrate.seeVerena")}<ArrowRight aria-hidden size={18} />
          </button>
        </section>
      )}

      {beat === 1 && (
        <section className="celebrate-beat" key="verena">
          <p className="celebrate-kicker">{t("celebrate.upgrade")}</p>
          <div className="evolve">
            <div className="evolve-old"><Character look={item.before} age={item.before.age} size={92} bare /></div>
            <ArrowRight aria-hidden size={22} className="evolve-arrow" />
            <div className="evolve-new">
              <span className="evolve-ring" aria-hidden />
              <Character look={item.after} age={item.after.age} size={190} bare mood="happy" alive wave />
            </div>
          </div>
          <h2 className="celebrate-title">{t("celebrate.nowAge", { age: item.after.age })}</h2>
          <ul className="evolve-list">
            {(lines.length ? lines : [t("celebrate.same")]).map((line) => <li key={line}><Sparkles aria-hidden size={14} />{line}</li>)}
          </ul>
          {app.fresh.length > 0 && (
            <ul className="evolve-badges">
              {app.fresh.filter((reward) => reward.kind === "badge").map((reward) => (
                <li key={reward.id}><Award aria-hidden size={16} />{rewardName(reward, t)}</li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn-primary celebrate-next" onClick={() => { tap(); setBeat(2); }} data-testid="celebrate-postcard">
            {t("celebrate.getPostcard")}<ArrowRight aria-hidden size={18} />
          </button>
        </section>
      )}

      {beat === 2 && (
        <section className="celebrate-beat" key="card">
          <figure className="live-postcard" data-testid="celebrate-card">
            <div className="live-postcard-art" ref={host}>
              <Character look={item.after} age={item.after.age} size={150} mood="happy" />
            </div>
            <figcaption className="stack-xs">
              <span className="kicker">{kicker}</span>
              <strong>{t("celebrate.postcardTitle", { age: item.after.age })}</strong>
              <span className="muted">{title}</span>
              {lines[0] && <em>{lines[0]}</em>}
              <span className="faint">{stats}</span>
            </figcaption>
            <span className="stamp" aria-hidden>SAATH</span>
          </figure>
          <div className="celebrate-actions">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void sharePicture()} data-testid="celebrate-share"><Share2 aria-hidden size={18} />{t("celebrate.sharePostcard")}</button>
            <button type="button" className="btn btn-secondary" onClick={() => void shareLink()}><Link2 aria-hidden size={18} />{t("celebrate.shareLink")}</button>
            <button type="button" className="btn btn-ghost" onClick={async () => {
              tap();
              try { await navigator.clipboard.writeText(`${shareLine}\n${pageUrl(item.path)}`); setNote(t("common.copied")); } catch { setNote(t("share.failed")); }
            }}><Copy aria-hidden size={18} />{t("common.copy")}</button>
          </div>
          {note && <p role="status" className="note">{note}</p>}
          <button type="button" className="btn btn-ghost" onClick={finish} data-testid="celebrate-done">{t("common.done")}</button>
        </section>
      )}
    </div>,
    document.body,
  );
}
