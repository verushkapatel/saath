"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Lock, MessageSquareWarning, ShieldAlert, ShieldCheck, ShoppingBasket, Sparkles, Trophy, X } from "lucide-react";
import { dayNumber } from "@/lib/challenges";
import { loadJson, type Copy, type GamesFile } from "@/lib/content-types";
import { XP } from "@/lib/progress";
import { tap } from "@/lib/speech";
import { useAiContext } from "./ai-context";
import { useApp } from "./app-state";
import { Character } from "./character";
import { useI18n } from "./providers";
import { ShareButton } from "./share-button";
import { PageSkeleton } from "./ui";

type GameId = "needs-wants" | "scam-or-safe";
type Round = { id: string; text: Copy; why: Copy; yes: boolean };

const ROUNDS = 8;
/** The scam game opens at this level, so there is something new to reach for. */
export const SCAM_GAME_LEVEL = 2;

/** A fixed shuffle for the day, so a round can be replayed but tomorrow brings a new order. */
function shuffled<T>(list: T[], seed: number): T[] {
  const out = [...list];
  let state = (seed * 9301 + 49297) % 233280;
  for (let index = out.length - 1; index > 0; index -= 1) {
    state = (state * 9301 + 49297) % 233280;
    const swap = Math.floor((state / 233280) * (index + 1));
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  return out;
}

function Play({ game, rounds, onExit }: { game: GameId; rounds: Round[]; onExit: () => void }) {
  const { t, code } = useI18n();
  const app = useApp();
  const [at, setAt] = useState(0);
  const [pick, setPick] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [xpBefore] = useState(app.progress.xp);
  const [ended, setEnded] = useState(false);
  const round = rounds[at];
  const yesLabel = game === "needs-wants" ? t("games.need") : t("games.scam");
  const noLabel = game === "needs-wants" ? t("games.want") : t("games.safe");
  const right = pick !== null && pick === round?.yes;

  function choose(value: boolean) {
    if (pick !== null) return;
    tap();
    setPick(value);
    if (value === round.yes) setScore((n) => n + 1);
  }

  function next() {
    tap();
    if (at + 1 >= rounds.length) {
      setEnded(true);
      void app.finishGame(game, score);
      return;
    }
    setAt(at + 1);
    setPick(null);
  }

  if (ended) {
    const best = Math.max(app.progress.games[game] ?? 0, score);
    const earned = app.progress.xp - xpBefore;
    return (
      <section className="game-end navy-scene stack scene-in">
        <Character look={{ outfit: "hoodie", extra: "headphones", place: "rooftop" }} age={21} size={150} mood={score >= rounds.length - 1 ? "proud" : score >= rounds.length / 2 ? "happy" : "neutral"} />
        <p className="kicker">{t(`games.${game}.title`)}</p>
        <p className="hero-num">{score}/{rounds.length}</p>
        <p className="lead">{score === rounds.length ? t("games.perfect") : score >= rounds.length / 2 ? t("games.good") : t("games.tryAgain")}</p>
        <p className="faint"><Trophy aria-hidden size={14} style={{ verticalAlign: "-2px" }} /> {t("games.best", { best, total: rounds.length })}</p>
        {earned > 0 ? <p className="xp-pop" role="status"><Sparkles aria-hidden size={16} /> {t("journey.xpEarned", { xp: earned })}</p> : <p className="faint">{t("games.xpOnce")}</p>}
        <ShareButton title="Saath" text={t("games.shareText", { game: t(`games.${game}.title`), score, total: rounds.length })} path="/games" />
        <button type="button" className="btn btn-primary" onClick={onExit}>{t("games.back")}</button>
      </section>
    );
  }

  return (
    <section className="stack game">
      <div className="row-between">
        <button type="button" className="link" onClick={onExit}><ChevronLeft aria-hidden size={18} />{t("games.title")}</button>
        <span className="pill-count num">{score} ✓</span>
      </div>
      <ol className="loop-dots" aria-hidden>
        {rounds.map((item, index) => <li key={item.id} className={index < at ? "was" : index === at ? "on" : undefined} />)}
      </ol>
      <p className="faint">{t("games.round", { n: at + 1, total: rounds.length })} · {t(`games.${game}.ask`)}</p>
      <div key={round.id} className={`game-card${game === "scam-or-safe" ? " message" : ""}${pick !== null ? (right ? " right" : " wrong") : ""}`}>
        {game === "scam-or-safe" && <span className="game-sender" aria-hidden><MessageSquareWarning size={16} /> {t("games.message")}</span>}
        <p>{round.text[code]}</p>
      </div>
      {pick === null ? (
        <div className="game-buttons">
          <button type="button" className="game-btn yes" onClick={() => choose(true)}>{game === "needs-wants" ? <ShoppingBasket aria-hidden size={22} /> : <ShieldAlert aria-hidden size={22} />}{yesLabel}</button>
          <button type="button" className="game-btn no" onClick={() => choose(false)}>{game === "needs-wants" ? <Sparkles aria-hidden size={22} /> : <ShieldCheck aria-hidden size={22} />}{noLabel}</button>
        </div>
      ) : (
        <div className="stack-sm scene-in" role="status">
          <p className={`game-verdict${right ? " right" : ""}`}>{right ? <Check aria-hidden size={18} strokeWidth={3} /> : <X aria-hidden size={18} strokeWidth={3} />} {right ? t("games.right") : t("games.wrong", { answer: round.yes ? yesLabel : noLabel })}</p>
          <p className="muted">{round.why[code]}</p>
          <button type="button" className="btn btn-primary" onClick={next}>{at + 1 >= rounds.length ? t("games.finish") : t("common.next")}<ChevronRight aria-hidden size={18} /></button>
        </div>
      )}
    </section>
  );
}

export function GamesScreen() {
  const { t } = useI18n();
  const app = useApp();
  const [file, setFile] = useState<GamesFile | null>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState<GameId | null>(null);
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    loadJson<GamesFile>("/content/games.json").then(setFile).catch(() => setFailed(true));
  }, []);

  useAiContext({ screen: t("games.title"), kind: "home", title: t("games.title"), suggestions: [t("games.askNeeds"), t("games.askScam")] });

  const rounds = useMemo(() => {
    if (!file || !playing) return [];
    const base = dayNumber(app.today) + seed;
    const list: Round[] = playing === "needs-wants"
      ? file.needs.map((item) => ({ id: item.id, text: item.text, why: item.why, yes: item.need }))
      : file.scams.map((item) => ({ id: item.id, text: item.text, why: item.why, yes: item.scam }));
    return shuffled(list, base).slice(0, ROUNDS);
  }, [file, playing, app.today, seed]);

  if (failed) return <p className="note err">{t("errors.generic")}</p>;
  if (!app.ready || !file) return <PageSkeleton />;
  if (playing && rounds.length) return <Play key={`${playing}-${seed}`} game={playing} rounds={rounds} onExit={() => { setPlaying(null); setSeed((n) => n + 1); }} />;

  const level = app.level.level;
  const games: { id: GameId; icon: React.ReactNode; locked: boolean }[] = [
    { id: "needs-wants", icon: <ShoppingBasket aria-hidden size={26} />, locked: false },
    { id: "scam-or-safe", icon: <ShieldAlert aria-hidden size={26} />, locked: level < SCAM_GAME_LEVEL },
  ];

  return (
    <div className="stack-lg rise">
      <div className="stack-xs">
        <p className="masthead">{t("games.kicker")}</p>
        <h1>{t("games.title")}</h1>
        <p className="lead">{t("games.lead", { xp: XP.game })}</p>
      </div>
      <div className="stack-sm">
        {games.map((game) => (
          <button key={game.id} type="button" className="game-tile" disabled={game.locked} onClick={() => { tap(); setPlaying(game.id); }}>
            <span className="game-icon">{game.locked ? <Lock aria-hidden size={22} /> : game.icon}</span>
            <span className="item-body">
              <span className="item-title">{t(`games.${game.id}.title`)}</span>
              <span className="item-sub">{game.locked ? t("games.opensAt", { level: SCAM_GAME_LEVEL }) : t(`games.${game.id}.lead`)}</span>
              {(app.progress.games[game.id] ?? 0) > 0 && <span className="item-sub"><Trophy aria-hidden size={12} /> {t("games.best", { best: app.progress.games[game.id], total: ROUNDS })}</span>}
            </span>
            {!game.locked && <ChevronRight aria-hidden size={20} />}
          </button>
        ))}
      </div>
      <p className="faint">{t("games.more")}</p>
      <Link href="/drills" className="card tight item">
        <span className="item-icon"><ShieldCheck aria-hidden size={20} /></span>
        <span className="item-body"><span className="item-title">{t("games.drillsTitle")}</span><span className="item-sub">{t("games.drillsLead")}</span></span>
        <ChevronRight aria-hidden size={20} />
      </Link>
    </div>
  );
}
