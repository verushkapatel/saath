"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { asset } from "@/lib/config";
import { shareText, tap } from "@/lib/speech";
import { useI18n } from "./providers";
import { Sheet } from "./ui";

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
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const payload = path ? `${text}\n${pageUrl(path)}` : text;
  return (
    <>
      <span className="share-wrap">
        <button type="button" className={className} onClick={() => { tap(); setOpen(true); }} data-testid="open-share-preview-button">
          <Share2 aria-hidden size={16} />{label ?? t("common.share")}
        </button>
        {note && <span role="status" className="share-note">{note}</span>}
      </span>
      {open && (
        <Sheet title={t("share.title")} onClose={() => setOpen(false)}>
          <div className="stack" data-testid="share-preview-sheet">
            <p className="muted">{t("share.lead")}</p>
            <div className="share-text-preview"><strong>{title}</strong><p>{text}</p>{path && <span className="faint">{pageUrl(path)}</span>}</div>
            <p className="note">{t("share.never")}</p>
            <button type="button" className="btn btn-primary" onClick={async () => {
              tap();
              const result = await shareText(title, payload);
              if (result === "shared") setOpen(false);
              else setNote(result === "copied" ? t("common.copied") : t("share.failed"));
            }} data-testid="share-confirm-button"><Share2 aria-hidden size={18} />{t("common.share")}</button>
            <button type="button" className="btn btn-secondary" onClick={async () => {
              tap();
              try { await navigator.clipboard.writeText(payload); setNote(t("common.copied")); setOpen(false); }
              catch { setNote(t("share.failed")); }
            }} data-testid="share-copy-button"><Copy aria-hidden size={18} />{t("common.copy")}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} data-testid="share-cancel-button">{t("common.cancel")}</button>
          </div>
        </Sheet>
      )}
    </>
  );
}
