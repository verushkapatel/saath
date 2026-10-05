import { asset } from "@/lib/config";

/**
 * The Saath mark: an S drawn as two companions walking together, each curve with its own head, one in ink and one
 * in navy. "Saath" means "together". Colours come from the theme, so the mark works on white and on black.
 */
export function LogoMark({ size = 32, title }: { size?: number; title?: string }) {
  const box = Math.round(size * 1.15);
  return (
    <svg
      className="logo-mark"
      viewBox="0 0 32 32"
      width={box}
      height={box}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d="M22.2 8.6 A6.4 6.4 0 1 0 16 16" fill="none" stroke="var(--text)" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M16 16 A6.4 6.4 0 1 1 9.8 23.4" fill="none" stroke="var(--navy)" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="26.4" cy="4.6" r="2.5" fill="var(--text)" />
      <circle cx="5.6" cy="27.4" r="2.5" fill="var(--navy)" />
    </svg>
  );
}

/** The round emblem of The Skyward Project, the team behind Saath. */
export function SkywardEmblem({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="skyward-emblem" src={asset("/skyward-logo.png")} alt="The Skyward Project" width={size} height={size} data-testid="skyward-emblem" />
  );
}

/** The mark with the name beside it, then a hairline and the Skyward emblem. */
export function Logo({ size = 28, emblem = true }: { size?: number; emblem?: boolean }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="brand-name">Saath</span>
      {emblem && (
        <>
          <span className="logo-divider" aria-hidden />
          <SkywardEmblem size={Math.round(size * 1.45)} />
        </>
      )}
    </span>
  );
}

/** "A Skyward Project initiative", with the emblem large enough to read. */
export function SkywardBadge({ size = 44 }: { size?: number }) {
  return (
    <span className="skyward-badge" data-testid="skyward-badge">
      <SkywardEmblem size={size} />
      <span><small>A project by</small> The Skyward Project</span>
    </span>
  );
}
