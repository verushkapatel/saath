"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { asset } from "@/lib/config";
import { shareText, tap } from "@/lib/speech";
import { useI18n } from "./providers";

/** The address of a page in Saath, for sharing. Only the page is shared, never anything the person saved. */
export function pageUrl(path = "/"): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${asset(path)}`;
}

/**
 * A small share button: the phone's share sheet when there is one, otherwise the text is copied.
 * What is shared is written by the screen (a title, a line or two and the page address). No money data, ever.
 */
export function ShareButton({ title, text, path, label, className = "share-btn" }: { title: string; text: string; path?: string; label?: string; className?: string }) {
  const { t } = useI18n();
  const [note, setNote] = useState<string | null>(null);
  return (
    <span className="share-wrap">
      <button
        type="button"
        className={className}
        onClick={async () => {
          tap();
          const result = await shareText(title, path ? `${text}\n${pageUrl(path)}` : text);
          setNote(result === "copied" ? t("common.copied") : result === "none" ? t("share.failed") : null);
          if (result !== "shared") window.setTimeout(() => setNote(null), 2400);
        }}
      >
        <Share2 aria-hidden size={16} />
        {label ?? t("common.share")}
      </button>
      {note && <span role="status" className="share-note">{note}</span>}
    </span>
  );
}
