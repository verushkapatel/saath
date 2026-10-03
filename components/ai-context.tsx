"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AiContext } from "@/lib/ai";

type AiState = {
  /** What the open screen says the person is looking at. */
  context: AiContext | null;
  publish: (context: AiContext | null) => void;
  askOpen: boolean;
  /** A question to send as soon as the sheet opens. */
  pending: string | null;
  openAsk: (question?: string) => void;
  closeAsk: () => void;
  takePending: () => string | null;
};

const Ctx = createContext<AiState | null>(null);

export function AiContextProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<AiContext | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const pendingRef = useRef<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const openAsk = useCallback((question?: string) => {
    pendingRef.current = question ?? null;
    setPending(question ?? null);
    setAskOpen(true);
  }, []);
  const closeAsk = useCallback(() => setAskOpen(false), []);
  const takePending = useCallback(() => {
    const value = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    return value;
  }, []);

  const value = useMemo(
    () => ({ context, publish: setContext, askOpen, pending, openAsk, closeAsk, takePending }),
    [context, askOpen, pending, openAsk, closeAsk, takePending],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAi(): AiState {
  const value = useContext(Ctx);
  if (!value) throw new Error("ai-context");
  return value;
}

/**
 * A screen calls this to tell Saath AI what is on it. The context is withdrawn when the screen closes,
 * so a question asked from Home is never answered as if it were about the last lesson.
 */
export function useAiContext(context: AiContext | null) {
  const { publish } = useAi();
  const key = context ? `${context.kind}|${context.id ?? ""}|${context.title ?? ""}|${context.text ?? ""}` : "";
  const latest = useRef(context);
  latest.current = context;
  useEffect(() => {
    publish(latest.current);
    return () => publish(null);
  }, [key, publish]);
}
