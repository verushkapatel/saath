import { useId } from "react";
import { asset } from "@/lib/config";

/**
 * The Saath mark: two linked rings, one in ink and one in navy. "Saath" means "together". Each ring passes over the
 * other once, with a clean gap at each crossing, so the two read as truly linked. Colours come from the theme, so the
 * mark works on white and on black.
 */
export function LogoMark({ size = 32, title }: { size?: number; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className="logo-mark"
      viewBox="0 0 36.2 25.2"
      width={(size * 36.2) / 25.2}
      height={size}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        {/* Where the navy ring passes over the ink ring (bottom), and the ink ring over the navy ring (top). */}
        <mask id={`ink${id}`} maskUnits="userSpaceOnUse">
          <rect width="36.2" height="25.2" fill="#fff" />
          <path d="M21.63 22.4A10 10 0 0 1 15.37 18.28" fill="none" stroke="#000" strokeWidth="5.4" />
        </mask>
        <mask id={`navy${id}`} maskUnits="userSpaceOnUse">
          <rect width="36.2" height="25.2" fill="#fff" />
          <path d="M14.57 2.8A10 10 0 0 1 20.83 6.92" fill="none" stroke="#000" strokeWidth="5.4" />
        </mask>
      </defs>
      <circle cx="12.6" cy="12.6" r="10" fill="none" stroke="var(--text)" strokeWidth="3.2" mask={`url(#ink${id})`} />
      <circle cx="23.6" cy="12.6" r="10" fill="none" stroke="var(--navy)" strokeWidth="3.2" mask={`url(#navy${id})`} />
    </svg>
  );
}

/** The round emblem of The Skyward Project, the team behind Saath. */
export function SkywardEmblem({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="skyward-emblem" src={asset("/skyward-logo-navy.png")} alt="The Skyward Project" width={size} height={size} data-testid="skyward-emblem" />
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
export function SkywardBadge({ size = 44, label = "A project by" }: { size?: number; label?: string }) {
  return (
    <span className="skyward-badge" data-testid="skyward-badge">
      <SkywardEmblem size={size} />
      <span><small>{label}</small> The Skyward Project</span>
    </span>
  );
}
