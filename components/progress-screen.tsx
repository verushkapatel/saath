"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Award, ChevronRight, Download, Lock, Share2 } from "lucide-react";
import { progressImage } from "@/lib/share-image";
import { REWARDS, met, safeLook, unlocked, type Need, type Reward, type RewardKind } from "@/lib/rewards";
import { shareText, tap } from "@/lib/speech";
import { useAiContext } from "./ai-context";
import { useApp } from "./app-state";
import { Character } from "./character";
import { Flame } from "./illustrations";
import { useI18n } from "./providers";
import { rewardName } from "./reward-sheet";
import { PageSkeleton, Sheet } from "./ui";

function useNeedText() {
  const { t, code } = useI18n();
  const { journey } = useApp();
  return (need: Need): string => {
    switch (need.type) {
      case "start": return t("rewards.need.start");
      case "level": return t("rewards.need.level", { n: need.value });
      case "episode": return t("rewards.need.episode", { title: journey?.episodes.find((item) => item.id === need.id)?.title[code] ?? need.id });
      case "episodes": return t("rewards.need.episodes", { n: need.value });
      case "streak": return t("rewards.need.streak", { n: need.value });
      case "lessons": return t("rewards.need.lessons", { n: need.value });
      case "stories": return t("rewards.need.stories", { n: need.value });
      case "paths": return t("rewards.need.paths", { n: need.value });
    }
  };
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Shows exactly what will be shared, then shares only that. Money Lab data is never part of it. */
export function ShareSheet({ onClose }: { onClose: () => void }) {
  const { t, code } = useI18n();
  const app = useApp();
  const svgHost = useRef<HTMLDivElement | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const snapshot = { progress: app.progress, streak: app.streak.count };
  const look = safeLook(snapshot);
  const open = unlocked(snapshot);
  const badge = [...REWARDS].reverse().find((reward) => reward.kind === "badge" && open.has(`badge:${reward.id}`)) ?? null;
  const lines = {
    level: t("prog.level", { level: app.level.level }),
    streak: app.streak.count ? t("home.streak", { count: app.streak.count }) : t("home.streakZero"),
    stage: app.story?.stage ? t("share.stage", { stage: app.story.stage.title[code] }) : "",
    badge: badge ? t("share.badge", { badge: rewardName(badge, t) }) : null,
  };
  const text = [`Saath: ${lines.level}`, lines.streak, lines.stage, lines.badge].filter(Boolean).join(". ");

  async function picture(): Promise<Blob | null> {
    const svg = svgHost.current?.querySelector("svg") ?? null;
    const style = getComputedStyle(document.body);
    const head = getComputedStyle(document.querySelector("h1, h2") ?? document.body);
    return progressImage(
      { ...lines, credit: t("common.footer"), font: style.fontFamily, headFont: head.fontFamily },
      svg as SVGSVGElement | null,
    );
  }

  async function shareImage() {
    tap();
    setBusy(true);
    setNote(null);
    try {
      const blob = await picture();
      if (!blob) throw new Error("canvas");
      const file = new File([blob], "saath-progress.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Saath", text });
      } else {
        download(blob, "saath-progress.png");
        setNote(t("share.saved"));
      }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") setNote(t("share.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={t("share.title")} onClose={onClose}>
      <div className="stack">
        <p className="muted">{t("share.lead")}</p>
        <figure className="share-card" aria-label={t("share.preview")}>
          <p className="share-brand">Saath</p>
          <div className="share-body">
            <div ref={svgHost} className="share-figure"><Character look={look} age={app.story?.age || 19} size={140} /></div>
            <div className="stack-xs">
              <strong className="share-level">{lines.level}</strong>
              <span>{lines.streak}</span>
              {lines.stage && <span>{lines.stage}</span>}
              {lines.badge && <span>{lines.badge}</span>}
            </div>
          </div>
          <figcaption className="faint">{t("common.footer")}</figcaption>
        </figure>
        <p className="note">{t("share.never")}</p>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void shareImage()}>
          <Share2 aria-hidden size={18} />{t("share.picture")}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={async () => {
            tap();
            const result = await shareText("Saath", text);
            setNote(result === "copied" ? t("common.copied") : result === "none" ? t("share.failed") : null);
          }}
        >
          {t("share.text")}
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={async () => { tap(); const blob = await picture(); if (blob) download(blob, "saath-progress.png"); }}>
          <Download aria-hidden size={18} />{t("share.download")}
        </button>
        {note && <p role="status" className="note">{note}</p>}
      </div>
    </Sheet>
  );
}

const KINDS: Exclude<RewardKind, "badge">[] = ["outfit", "extra", "place"];

export function ProgressScreen() {
  const { t, code } = useI18n();
  const app = useApp();
  const needText = useNeedText();
  const [sharing, setSharing] = useState(false);
  const snapshot = useMemo(() => ({ progress: app.progress, streak: app.streak.count }), [app.progress, app.streak.count]);

  useAiContext({
    screen: t("nav.progress"),
    kind: "progress",
    title: t("prog.title"),
    suggestions: [t("ai.summary"), t("ai.revise")],
  });

  if (!app.ready) return <PageSkeleton />;
  const look = safeLook(snapshot);
  const open = unlocked(snapshot);
  const badges = REWARDS.filter((reward) => reward.kind === "badge");
  const level = app.level;

  function choose(reward: Reward) {
    if (!open.has(`${reward.kind}:${reward.id}`)) return;
    tap();
    void app.saveLook({ [reward.kind]: reward.id });
  }

  return (
    <div className="stack-lg rise">
      <div className="stack-xs">
        <p className="masthead">{t("prog.kicker")}</p>
        <h1>{t("prog.title")}</h1>
      </div>

      <section className="card hero journey-hero">
        <div className="stage">
          <Character look={look} age={app.story?.age || 19} size={150} label={t("prog.figure")} />
        </div>
        <div className="stack-sm">
          <p className="hero-num md">{t("prog.level", { level: level.level })}</p>
          <div className="row-between">
            <span className="faint">{t("prog.toNext", { xp: level.need - level.into, next: level.level + 1 })}</span>
            <span className="num faint">{app.progress.xp} XP</span>
          </div>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={level.need} aria-valuenow={level.into} aria-label={t("prog.xpBar")}>
            <span style={{ width: `${Math.max(3, level.ratio * 100)}%` }} />
          </div>
          <p className="streak-line"><Flame lit={app.streak.count > 0} /> {app.streak.count ? t("home.streak", { count: app.streak.count }) : t("home.streakZero")}</p>
          <button type="button" className="btn btn-secondary" onClick={() => { tap(); setSharing(true); }}>
            <Share2 aria-hidden size={18} />{t("share.open")}
          </button>
        </div>
      </section>

      <dl className="stats four">
        <div><dt>{t("prog.episodes")}</dt><dd>{app.story?.done ?? 0} / {app.story?.total ?? 0}</dd></div>
        <div><dt>{t("prog.lessons")}</dt><dd>{app.progress.lessons.length} / {app.lessons.length}</dd></div>
        <div><dt>{t("prog.stories")}</dt><dd>{app.progress.stories.length}</dd></div>
        <div><dt>{t("prog.forms")}</dt><dd>{app.progress.forms.length}</dd></div>
      </dl>

      <section className="stack-sm" aria-labelledby="badges-h">
        <h2 id="badges-h">{t("prog.badges")}</h2>
        <ul className="badge-grid">
          {badges.map((reward) => {
            const have = met(reward.need, snapshot);
            return (
              <li key={reward.id} className={`badge${have ? " have" : ""}`}>
                <span className="badge-art" aria-hidden>{have ? <Award size={26} strokeWidth={1.5} /> : <Lock size={20} />}</span>
                <strong>{rewardName(reward, t)}</strong>
                <span className="faint">{have ? t(`rewards.why.${reward.id}`) : needText(reward.need)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="stack-sm" aria-labelledby="look-h">
        <h2 id="look-h">{t("prog.customise")}</h2>
        <p className="faint">{t("prog.customiseLead")}</p>
        {KINDS.map((kind) => (
          <div key={kind} className="stack-xs">
            <p className="label">{t(`prog.${kind}`)}</p>
            <div className="cluster" role="group" aria-label={t(`prog.${kind}`)}>
              {REWARDS.filter((reward) => reward.kind === kind).map((reward) => {
                const have = open.has(`${reward.kind}:${reward.id}`);
                return (
                  <button
                    key={reward.id}
                    type="button"
                    className="chip"
                    aria-pressed={look[kind] === reward.id}
                    disabled={!have}
                    title={have ? undefined : needText(reward.need)}
                    onClick={() => choose(reward)}
                  >
                    {!have && <Lock aria-hidden size={12} />} {rewardName(reward, t)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="faint">{t("prog.lockedHint")}</p>
      </section>

      <Link href="/check" className="card tight" onClick={tap}>
        <span className="item" style={{ padding: 0, minHeight: 0 }}>
          <span className="item-body">
            <span className="item-title">{t("prog.finlit")}</span>
            <span className="item-sub">{t("prog.finlitSub")}</span>
          </span>
          <span className="item-end"><ChevronRight aria-hidden size={20} /></span>
        </span>
      </Link>

      {app.journey && <p className="faint">{t("prog.storyName", { name: app.journey.name[code] })}</p>}
      {sharing && <ShareSheet onClose={() => setSharing(false)} />}
    </div>
  );
}
