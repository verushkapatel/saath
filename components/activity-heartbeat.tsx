"use client";

import { useEffect } from "react";
import { heartbeat, serviceConfigured } from "@/lib/service";

/** Counts an anonymous active browser session. No username, money data or device fingerprint is sent. */
export function ActivityHeartbeat() {
  useEffect(() => {
    if (!serviceConfigured()) return;
    const ping = () => {
      if (document.visibilityState === "visible") void heartbeat().catch(() => undefined);
    };
    ping();
    const timer = window.setInterval(ping, 120_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
  return null;
}