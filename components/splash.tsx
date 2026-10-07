"use client";

import { useEffect, useState } from "react";

const SEEN = "saath-splash";
/** Decided once per page load, so a second run of the effect (React does this in development) still closes it. */
let showingThisLoad = false;
let finishedThisLoad = false;

/**
 * The opening: the Saath rings draw themselves in, the name rises beneath them, and the screen fades to whatever
 * comes next (choosing a language, or the landing page). Shown once per visit, and skipped for reduced motion.
 */
export function Splash() {
  const [phase, setPhase] = useState<"show" | "leave" | "gone">("gone");
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN) === "1";
      sessionStorage.setItem(SEEN, "1");
    } catch {
      // Storage can be blocked; show the opening anyway.
    }
    if (finishedThisLoad || (seen && !showingThisLoad) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    showingThisLoad = true;
    setPhase("show");
    const leave = window.setTimeout(() => setPhase("leave"), 1900);
    const gone = window.setTimeout(() => { finishedThisLoad = true; setPhase("gone"); }, 2600);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(gone);
    };
  }, []);
  if (phase === "gone") return null;
  return (
    <div className={`splash${phase === "leave" ? " leave" : ""}`} aria-hidden data-testid="splash">
      <div className="splash-in">
        <svg className="splash-mark" viewBox="0 0 36.2 25.2" width="168" height="117">
          <defs>
            <mask id="splash-ink" maskUnits="userSpaceOnUse">
              <rect width="36.2" height="25.2" fill="#fff" />
              <path d="M21.63 22.4A10 10 0 0 1 15.37 18.28" fill="none" stroke="#000" strokeWidth="5.4" />
            </mask>
            <mask id="splash-navy" maskUnits="userSpaceOnUse">
              <rect width="36.2" height="25.2" fill="#fff" />
              <path d="M14.57 2.8A10 10 0 0 1 20.83 6.92" fill="none" stroke="#000" strokeWidth="5.4" />
            </mask>
          </defs>
          <g mask="url(#splash-ink)"><circle className="ring a" cx="12.6" cy="12.6" r="10" pathLength="100" /></g>
          <g mask="url(#splash-navy)"><circle className="ring b" cx="23.6" cy="12.6" r="10" pathLength="100" /></g>
        </svg>
        <p className="splash-name">Saath</p>
        <p className="splash-by">The Skyward Project</p>
      </div>
    </div>
  );
}
