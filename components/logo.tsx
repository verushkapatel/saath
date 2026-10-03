/**
 * The Saath mark: two rings that overlap, one in ink and one in navy. "Saath" means "together".
 * Colours come from the theme, so the mark works on white and on black.
 */
export function LogoMark({ size = 32, title }: { size?: number; title?: string }) {
  return (
    <svg
      className="logo-mark"
      viewBox="0 0 44 30"
      width={(size * 44) / 30}
      height={size}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx="15" cy="15" r="11" fill="none" stroke="var(--text)" strokeWidth="3.4" />
      <circle cx="29" cy="15" r="11" fill="none" stroke="var(--navy)" strokeWidth="3.4" />
      {/* The ink ring passes over the navy one at the top, so the two read as linked rather than stacked. */}
      <path d="M20.5 5.47 A11 11 0 0 1 24.53 9.5" fill="none" stroke="var(--text)" strokeWidth="3.4" strokeLinecap="butt" />
    </svg>
  );
}

/** The mark with the name beside it. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="brand-name">Saath</span>
    </span>
  );
}
