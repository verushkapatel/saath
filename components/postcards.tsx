"use client";

import { useRef, useState } from "react";
import { Copy, Lock, Share2 } from "lucide-react";
import { asset } from "@/lib/config";
import { postcards, type Postcard } from "@/lib/postcards";
import { postcardImage } from "@/lib/share-image";
import { tap } from "@/lib/speech";
import { useApp } from "./app-state";
import { Character } from "./character";
import { LogoMark, SkywardEmblem } from "./logo";
import { useI18n } from "./providers";
import { Sheet } from "./ui";

function useCardText(card: Postcard) {
  const { t, code } = useI18n();
  const app = useApp();
  const name = app.journey?.name[code] ?? "Verena";
  const title = t(`postcards.cards.${card.id}.title`);
  const lesson = t(`postcards.cards.${card.id}.lesson`);
  const range = t("postcards.range", { from: card.from, to: card.to, ageFrom: card.ageFrom, ageTo: card.ageTo });
  const stats = [
    t("prog.level", { level: app.level.level }),
    `${app.progress.xp} XP`,
    app.streak.count ? t("home.streak", { count: app.streak.count }) : "",
  ].filter(Boolean).join(" · ");
  const kicker = t("postcards.kicker", { n: card.index + 1, total: 6, name });
  const text = `${t("postcards.shareHead", { name, title })}. ${range}. "${lesson}" ${stats}. Saath`;
  return { name, title, lesson, range, stats, kicker, text };
}

function PostcardSheet({ card, onClose }: { card: Postcard; onClose: () => void }) {
  const { t } = useI18n();
  const words = useCardText(card);
  const host = useRef<HTMLDivElement | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function share() {
    tap();
    setBusy(true);
    setNote(null);
    try {
      const style = getComputedStyle(document.body);
      const blob = await postcardImage(
        { ...words, credit: t("common.footer"), font: style.fontFamily, headFont: style.fontFamily, emblem: asset("/skyward-logo.png") },
        host.current?.querySelector("svg") ?? null,
      );
      if (!blob) throw new Error("canvas");
      const file = new File([blob], `saath-postcard-${card.id}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Saath", text: words.text });
        onClose();
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

  return (
    <Sheet title={t("postcards.sheetTitle")} onClose={onClose}>
      <div className="stack" data-testid="postcard-share-sheet">
        <p className="muted">{t("share.lead")}</p>
        <figure className="share-card postcard-preview" aria-label={t("share.preview")} data-testid="postcard-preview">
          <p className="share-brand row-between">
            <span className="logo"><LogoMark size={22} /> Saath</span>
            <SkywardEmblem size={30} />
          </p>
          <div className="share-body">
            <div ref={host} className="share-figure"><Character look={card.look} age={card.ageFrom} size={130} mood="happy" /></div>
            <div className="stack-xs">
              <span className="kicker faint">{words.kicker}</span>
              <strong className="share-level">{words.title}</strong>
              <span>{words.range}</span>
              <em className="postcard-lesson">&ldquo;{words.lesson}&rdquo;</em>
              <span className="faint">{words.stats}</span>
            </div>
          </div>
          <figcaption className="faint">{t("common.footer")}</figcaption>
        </figure>
        <p className="note">{t("share.never")}</p>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void share()} data-testid="postcard-share-button">
          <Share2 aria-hidden size={18} />{t("common.share")}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          data-testid="postcard-copy-button"
          onClick={async () => {
            tap();
            try { await navigator.clipboard.writeText(words.text); setNote(t("common.copied")); }
            catch { setNote(t("share.failed")); }
          }}
        >
          <Copy aria-hidden size={18} />{t("common.copy")}
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose} data-testid="postcard-cancel-button">{t("common.cancel")}</button>
        {note && <p role="status" className="note" data-testid="postcard-share-note">{note}</p>}
      </div>
    </Sheet>
  );
}

function Tile({ card, onOpen }: { card: Postcard; onOpen: () => void }) {
  const { t } = useI18n();
  const title = t(`postcards.cards.${card.id}.title`);
  if (!card.unlocked) {
    return (
      <li className="postcard locked" data-testid={`postcard-${card.id}`}>
        <span className="postcard-art" aria-hidden><Lock size={18} /></span>
        <strong>{title}</strong>
        <span className="faint">{t("postcards.unlockAt", { n: card.from })}</span>
      </li>
    );
  }
  return (
    <li className="postcard" data-testid={`postcard-${card.id}`}>
      <button type="button" onClick={() => { tap(); onOpen(); }} aria-label={t("postcards.open", { title })} data-testid={`postcard-open-${card.id}`}>
        <span className="postcard-art"><Character look={card.look} age={card.ageFrom} size={84} bare /></span>
        <strong>{title}</strong>
        <span className="faint">{t("postcards.ages", { ageFrom: card.ageFrom, ageTo: card.ageTo })}</span>
      </button>
    </li>
  );
}

/** The postcard collection: a picture of Verena for each life stage, unlocked as the story goes on. */
export function Postcards() {
  const { t } = useI18n();
  const app = useApp();
  const [open, setOpen] = useState<Postcard | null>(null);
  if (!app.journey) return null;
  const cards = postcards(app.journey.episodes, app.progress.journey);
  const have = cards.filter((card) => card.unlocked).length;
  return (
    <section className="stack-sm" aria-labelledby="postcards-h" data-testid="postcards-section">
      <div className="row-between">
        <h2 id="postcards-h">{t("postcards.title")}</h2>
        <span className="faint num" data-testid="postcards-count">{have} / {cards.length}</span>
      </div>
      <p className="faint">{t("postcards.lead")}</p>
      <ul className="postcard-grid">
        {cards.map((card) => <Tile key={card.id} card={card} onOpen={() => setOpen(card)} />)}
      </ul>
      {open && <PostcardSheet card={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
