"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, ExternalLink, MessageCircle } from "lucide-react";
import { loadJson, type RealStory, type StoriesFile } from "@/lib/content-types";
import { pickByDay } from "@/lib/daily";
import { dayLabel } from "@/lib/format";
import { tap } from "@/lib/speech";
import { useAi, useAiContext } from "./ai-context";
import { useApp } from "./app-state";
import { useI18n } from "./providers";
import { ShareButton } from "./share-button";
import { ListenButton, PageSkeleton } from "./ui";

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

function StoryView({ story }: { story: RealStory }) {
  const { t, code } = useI18n();
  const app = useApp();
  const ai = useAi();
  const read = app.progress.stories.includes(story.id);
  const spoken = [story.title[code], story.what[code], story.lesson[code], story.act[code]].join(". ");
  return (
    <article className="stack">
      <div className="stack-xs">
        <p className="kicker">{t(`stories.kind.${story.kind}`)} · {t(`topics.${story.topic}`)}</p>
        <h2 className="story-title">{story.title[code]}</h2>
        <p className="faint">{story.when[code]}</p>
      </div>
      <ListenButton text={spoken} />
      <div className="prose"><p>{story.what[code]}</p></div>
      <section className="card flat stack-xs">
        <p className="kicker">{t("stories.lesson")}</p>
        <p>{story.lesson[code]}</p>
      </section>
      <section className="card tight stack-xs">
        <p className="kicker">{t("stories.act")}</p>
        <p>{story.act[code]}</p>
      </section>
      <div className="stack-xs sources">
        <p className="faint">
          {t("stories.source")}:{" "}
          <a href={story.source.url} target="_blank" rel="noopener noreferrer">
            {story.source.name}, “{story.source.title}” <ExternalLink aria-hidden size={12} />
          </a>{" "}
          ({story.source.published})
        </p>
        {story.also?.length ? (
          <p className="faint">
            {t("stories.also")}:{" "}
            {story.also.map((item, at) => (
              <span key={item.url}>{at > 0 ? ", " : ""}<a href={item.url} target="_blank" rel="noopener noreferrer">{item.name || host(item.url)}</a></span>
            ))}
          </p>
        ) : null}
        <p className="faint">{t("stories.verified", { date: dayLabel(story.verified, code) })} {t(`stories.kindNote.${story.kind}`)}</p>
      </div>
      {story.guides.length > 0 && (
        <ul className="cluster">
          {story.guides.map((guideId) => {
            const lesson = app.lessons.find((item) => item.id === guideId);
            return lesson ? <li key={guideId}><Link className="chip" href={`/guide/${guideId}`}>{lesson.title[code]}</Link></li> : null;
          })}
        </ul>
      )}
      {read ? (
        <p className="note ok"><Check aria-hidden size={16} style={{ verticalAlign: "-3px" }} /> {t("stories.read")}</p>
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => { tap(); void app.markStory(story.id); }}>{t("stories.markRead")}</button>
      )}
      <ShareButton title={story.title[code]} text={`${story.title[code]}. ${story.lesson[code]}`} path="/stories" />
      <button type="button" className="btn btn-ghost" onClick={() => { tap(); ai.openAsk(t("stories.askHow")); }}>
        <MessageCircle aria-hidden size={18} />{t("stories.askSaath")}
      </button>
    </article>
  );
}

export function StoriesScreen() {
  const { t, code } = useI18n();
  const app = useApp();
  const [file, setFile] = useState<StoriesFile | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    loadJson<StoriesFile>("/content/stories.json").then(setFile).catch(() => setFailed(true));
  }, []);

  const today = useMemo(() => (file ? pickByDay(file.stories, app.today) : null), [file, app.today]);
  const shown = file?.stories.find((item) => item.id === picked) ?? today;

  useAiContext(shown ? {
    screen: t("nav.stories"),
    kind: "story",
    id: shown.id,
    title: shown.title[code],
    text: `${shown.what[code]}\n${shown.lesson[code]}\n${shown.act[code]}`,
    suggestions: [t("stories.askHow"), t("stories.askSpot")],
  } : null);

  if (failed) return <p className="note err">{t("errors.generic")}</p>;
  if (!file || !shown) return <PageSkeleton />;

  return (
    <div className="stack-lg rise">
      <div className="stack-xs">
        <p className="masthead">{shown.id === today?.id ? t("stories.today") : t("stories.fromArchive")}</p>
        <h1>{t("stories.title")}</h1>
        <p className="lead">{t("stories.lead")}</p>
      </div>
      <StoryView key={shown.id} story={shown} />
      <hr className="rule-double" />
      <section className="stack-sm" aria-labelledby="all-h">
        <h2 id="all-h">{t("stories.all")}</h2>
        <ul className="list card tight">
          {file.stories.map((item) => {
            const read = app.progress.stories.includes(item.id);
            return (
              <li key={item.id}>
                <button type="button" className="item" aria-current={item.id === shown.id ? "true" : undefined} onClick={() => { tap(); setPicked(item.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  <span className={`item-icon${read ? " done" : ""}`}>{read ? <Check aria-hidden size={18} strokeWidth={3} /> : <span aria-hidden>·</span>}</span>
                  <span className="item-body">
                    <span className="item-title">{item.title[code]}</span>
                    <span className="item-sub">{t(`stories.kind.${item.kind}`)} · {t(`topics.${item.topic}`)}</span>
                  </span>
                  <span className="item-end"><ChevronRight aria-hidden size={20} /></span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="faint">{file.note[code]}</p>
      </section>
    </div>
  );
}
