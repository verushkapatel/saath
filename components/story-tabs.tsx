"use client";

import Link from "next/link";
import { tap } from "@/lib/speech";
import { useI18n } from "./providers";

/** Story and Progress sit side by side: two views of the same journey. */
export function StoryTabs({ current }: { current: "story" | "progress" }) {
  const { t } = useI18n();
  return (
    <nav className="seg story-tabs" aria-label={t("nav.journey")} data-testid="story-subtabs">
      <Link href="/journey" aria-current={current === "story" ? "page" : undefined} onClick={tap} data-testid="story-subtab-story">{t("nav.journey")}</Link>
      <Link href="/progress" aria-current={current === "progress" ? "page" : undefined} onClick={tap} data-testid="story-subtab-progress">{t("nav.progress")}</Link>
    </nav>
  );
}
