"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { tap } from "@/lib/speech";
import { useAi } from "./ai-context";
import { useI18n } from "./providers";

/**
 * Select any words on any screen and a small "Ask Saath AI" chip appears above them. Tapping it opens the chat with
 * those words attached, so a person can ask about exactly the line that confused them.
 */
export function SelectAsk() {
  const { t } = useI18n();
  const ai = useAi();
  const [spot, setSpot] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    let timer = 0;
    const read = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().replace(/\s+/g, " ").trim() ?? "";
        const node = selection?.anchorNode?.parentElement;
        if (!selection || selection.rangeCount === 0 || text.length < 6 || text.length > 800 || !node?.closest("#content, .walk") || node.closest("input, textarea, .sheet")) {
          setSpot(null);
          return;
        }
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        setSpot({ x: Math.min(window.innerWidth - 90, Math.max(90, rect.left + rect.width / 2)), y: Math.max(64, rect.top - 10), text });
      }, 250);
    };
    const hide = () => setSpot(null);
    document.addEventListener("selectionchange", read);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("selectionchange", read);
      window.removeEventListener("scroll", hide);
    };
  }, []);

  if (!spot) return null;
  return createPortal(
    <button
      type="button"
      className="select-ask"
      style={{ left: spot.x, top: spot.y }}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        tap();
        const quote = spot.text.length > 160 ? `${spot.text.slice(0, 157)}…` : spot.text;
        ai.openAsk(t("ai.selectAsk", { text: quote }), { kind: "cite", title: quote, text: spot.text });
        window.getSelection()?.removeAllRanges();
        setSpot(null);
      }}
      data-testid="select-ask"
    >
      <Sparkles aria-hidden size={14} />{t("ai.askThis")}
    </button>,
    document.body,
  );
}
