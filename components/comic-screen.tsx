"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { asset } from "@/lib/config";
import { loadJson, type Copy } from "@/lib/content-types";
import { useI18n } from "./providers";
import { ListenButton, PageSkeleton } from "./ui";

type Panel = { image: string | null; caption: Copy };
type Episode = { id: string; sample?: boolean; title: Copy; panels: Panel[] };

/** A swipeable panel reader. Panels with no picture yet show a plain frame, clearly marked as a sample. */
export function ComicScreen() {
  const { t, code } = useI18n();
  const [episodes, setEpisodes] = useState<Episode[] | null>(null);
  const [at, setAt] = useState(0);
  const strip = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    loadJson<{ episodes: Episode[] }>("/content/comic.json").then((data) => setEpisodes(data.episodes)).catch(() => setEpisodes([]));
  }, []);

  if (!episodes) return <PageSkeleton />;
  const episode = episodes[0];
  if (!episode) return <p className="lead">{t("errors.missing")}</p>;
  const panel = episode.panels[at];

  return (
    <article className="stack">
      <Link href="/guide" className="link"><ChevronLeft aria-hidden size={18} />{t("nav.guide")}</Link>
      <div className="stack-sm">
        <p className="masthead">{t("comic.title")}</p>
        <h1>{episode.title[code]}</h1>
        {episode.sample && <p className="note">{t("comic.sample")}</p>}
      </div>
      <ol
        className="comic"
        ref={strip}
        aria-label={t("comic.hint")}
        onScroll={(event) => {
          const el = event.currentTarget;
          const index = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          if (index !== at) setAt(Math.min(episode.panels.length - 1, Math.max(0, index)));
        }}
      >
        {episode.panels.map((item, index) => (
          <li key={index}>
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset(item.image)} alt={item.caption[code]} loading="lazy" />
            ) : (
              <svg viewBox="0 0 300 300" role="img" aria-label={t("comic.placeholder", { n: index + 1 })} className="comic-blank">
                <rect x="6" y="6" width="288" height="288" rx="10" className="ink" />
                <path className="ink" d="M40 220l60-70 46 50 34-38 80 78" opacity="0.5" />
                <circle className="gold" cx="220" cy="92" r="22" />
                <text x="150" y="268" textAnchor="middle">{t("comic.placeholder", { n: index + 1 })}</text>
              </svg>
            )}
          </li>
        ))}
      </ol>
      <div className="row-between">
        <p className="faint num" aria-live="polite">{t("comic.panel", { current: at + 1, total: episode.panels.length })}</p>
        <ListenButton text={panel.caption[code]} />
      </div>
      <p className="caption">{panel.caption[code]}</p>
      <p className="faint center">{t("comic.hint")}</p>
    </article>
  );
}
