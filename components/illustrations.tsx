/*
  Saath illustrations. One line style throughout: 2px rounded strokes in the text colour,
  with gold for the one thing that matters in the picture. No faces, no photos.
*/

function Art({ label, small, children }: { label: string; small?: boolean; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 200 140" role="img" aria-label={label} className={small ? "art sm" : "art"}>
      {children}
    </svg>
  );
}

/** First launch: a paper held under a small light. */
export function ArtFirst({ label }: { label: string }) {
  return (
    <Art label={label}>
      <circle className="soft" cx="100" cy="66" r="54" />
      <path className="gold" d="M100 14v10M76 22l5 9M124 22l-5 9" />
      <rect className="ink" x="70" y="40" width="60" height="76" rx="8" />
      <path className="gold" d="M82 58h36" />
      <path className="ink" d="M82 72h36M82 84h26M82 96h30" />
      <path className="ink" d="M58 124c8-10 18-12 28-8M142 124c-8-10-18-12-28-8" />
    </Art>
  );
}

/** First scan: a paper inside a camera frame. */
export function ArtScan({ label, small }: { label: string; small?: boolean }) {
  return (
    <Art label={label} small={small}>
      <circle className="soft" cx="100" cy="70" r="54" />
      <path className="gold" d="M52 40V28h12M148 40V28h-12M52 100v12h12M148 100v12h-12" />
      <rect className="ink" x="74" y="34" width="52" height="72" rx="6" />
      <path className="ink" d="M84 50h32M84 62h32M84 74h20" />
      <path className="gold" d="M60 88h80" />
    </Art>
  );
}

/** Successful scan: a paper that has been read, with a gold tick. */
export function ArtDone({ label, small }: { label: string; small?: boolean }) {
  return (
    <Art label={label} small={small}>
      <circle className="soft-gold" cx="100" cy="70" r="52" />
      <rect className="ink" x="66" y="28" width="56" height="78" rx="8" />
      <path className="ink" d="M78 46h32M78 58h32M78 70h20" />
      <circle className="gold-fill" cx="124" cy="98" r="18" />
      <path d="M115 98l6 6 12-13" fill="none" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </Art>
  );
}

/** Path complete: a path reaching a flag on a hill. */
export function ArtPath({ label, small }: { label: string; small?: boolean }) {
  return (
    <Art label={label} small={small}>
      <circle className="soft-gold" cx="150" cy="40" r="34" />
      <path className="ink" d="M20 120c30-4 46-30 78-40s54-26 74-44" />
      <path className="ink" d="M24 122h152" opacity="0.4" />
      <path className="ink" d="M150 58V22" />
      <path className="gold-fill" d="M150 22l28 9-28 10z" />
      <circle className="gold-fill" cx="44" cy="112" r="4" />
      <circle className="gold-fill" cx="90" cy="84" r="4" />
      <circle className="gold-fill" cx="128" cy="64" r="4" />
    </Art>
  );
}

/** Streak milestone: a steady flame on a small lamp. */
export function ArtStreak({ label, small }: { label: string; small?: boolean }) {
  return (
    <Art label={label} small={small}>
      <circle className="soft" cx="100" cy="62" r="44" />
      <path className="gold" d="M100 26c10 14 20 22 20 36a20 20 0 0 1-40 0c0-10 6-14 10-22 2 6 6 8 8 6 2-4 2-12 2-20z" />
      <path className="ink" d="M68 100h64l-8 16H76z" />
      <path className="ink" d="M56 124h88" />
    </Art>
  );
}

/** Empty tracker: a jar waiting for its first coin. */
export function ArtJar({ label, small }: { label: string; small?: boolean }) {
  return (
    <Art label={label} small={small}>
      <rect className="ink" x="78" y="30" width="44" height="12" rx="4" />
      <circle className="soft" cx="100" cy="82" r="50" />
      <path className="ink" d="M72 42h56v10c8 6 10 14 10 26v24a14 14 0 0 1-14 14H76a14 14 0 0 1-14-14V78c0-12 2-20 10-26z" />
      <circle className="gold" cx="100" cy="18" r="8" />
      <path className="gold" d="M100 14v8" />
      <path className="ink" d="M76 96h48" opacity="0.4" />
    </Art>
  );
}

/** Offline: a phone with no signal. */
export function ArtOffline({ label, small }: { label: string; small?: boolean }) {
  return (
    <Art label={label} small={small}>
      <circle className="soft" cx="100" cy="70" r="56" />
      <rect className="ink" x="72" y="20" width="56" height="100" rx="10" />
      <path className="ink" d="M92 108h16" />
      <path className="ink" d="M84 66c10-10 22-10 32 0M91 76c6-6 12-6 18 0" opacity="0.5" />
      <circle className="ink" cx="100" cy="86" r="2" />
      <path className="gold" d="M82 44l36 48" />
    </Art>
  );
}

export function Flame({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 56 64" className={`flame ${lit ? "lit" : "cold"}`} aria-hidden>
      <path
        fill="currentColor"
        d="M28 2c8 11 20 19 20 35a20 20 0 0 1-40 0c0-9 5-14 9-21 2 6 5 8 8 6 3-4 3-12 3-20z"
      />
      <path fill="var(--surface-1)" opacity="0.55" d="M28 34c4 5 8 8 8 14a8 8 0 0 1-16 0c0-5 4-8 8-14z" />
    </svg>
  );
}

/** FinLit Check: four bars of different lengths, one in gold. */
export function ArtCheck({ label, small }: { label: string; small?: boolean }) {
  return (
    <Art label={label} small={small}>
      <circle className="soft" cx="100" cy="70" r="56" />
      <path className="ink" d="M52 44h74M52 64h44M52 104h60" />
      <path className="gold" d="M52 84h96" />
      <path className="ink" d="M44 30v88" opacity="0.4" />
    </Art>
  );
}

/** Drills: a phone showing a message that needs a second look. */
export function ArtDrill({ label, small }: { label: string; small?: boolean }) {
  return (
    <Art label={label} small={small}>
      <circle className="soft" cx="100" cy="70" r="56" />
      <rect className="ink" x="70" y="18" width="60" height="104" rx="10" />
      <rect className="ink" x="80" y="38" width="40" height="26" rx="6" />
      <path className="gold" d="M95 46c0-6 10-6 10 0 0 4-5 4-5 8M100 59v1" />
      <path className="ink" d="M82 78h36M82 90h24M92 110h16" opacity="0.5" />
    </Art>
  );
}
