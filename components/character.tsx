import type { Look } from "@/lib/progress";

/**
 * Ira, drawn in ink. One figure, a few outfits, a few places.
 * Everything is stroke and fill from the theme, so she is black on white in light mode and white on black in dark mode.
 * Her hair changes with the age of the episode she is in.
 */

function Place({ place }: { place: string }) {
  switch (place) {
    case "office":
      return (
        <g className="ch-scene">
          <rect x="18" y="150" width="62" height="6" rx="2" />
          <path d="M26 156v58M72 156v58" />
          <rect x="32" y="118" width="34" height="24" rx="3" />
          <path d="M49 142v8M40 150h18" />
          <rect x="150" y="60" width="34" height="46" rx="3" />
          <path d="M150 76h34M150 92h34M167 60v46" />
        </g>
      );
    case "bank":
      return (
        <g className="ch-scene">
          <path d="M14 96 44 76l30 20M20 96v70M32 96v70M56 96v70M68 96v70M14 166h60" />
          <rect x="146" y="132" width="44" height="34" rx="3" />
          <path d="M146 144h44M160 132v-14h16v14" />
          <circle cx="168" cy="155" r="4" />
        </g>
      );
    case "home":
      return (
        <g className="ch-scene">
          <rect x="16" y="64" width="38" height="30" rx="2" />
          <path d="M22 86l9-10 7 7 5-5 6 8" />
          <path d="M142 170v-22a8 8 0 0 1 8-8h30a8 8 0 0 1 8 8v22M136 170v18h58v-18M136 170h58" />
          <path d="M150 188v10M180 188v10" />
        </g>
      );
    case "garden":
      return (
        <g className="ch-scene">
          <path d="M34 214v-70" />
          <path d="M34 150c-22 0-26-26-10-36-6-20 20-30 28-14 18-6 28 18 14 30 6 14-10 24-32 20z" />
          <path d="M146 190h44M150 190v20M186 190v20M146 176h44" />
          <path d="M160 214c0-10 4-14 4-22M172 214c0-8-4-12-2-20" />
        </g>
      );
    default:
      return (
        <g className="ch-scene">
          <rect x="18" y="58" width="42" height="52" rx="3" />
          <path d="M39 58v52M18 84h42" />
          <path d="M146 110h42M146 140h42M150 110v-12h8v12M162 110v-18h7v18M174 110v-9h8v9M152 140v-10h14v10" />
        </g>
      );
  }
}

function Hair({ age }: { age: number }) {
  if (age >= 50) {
    return (
      <g>
        <circle className="ch-ink" cx="100" cy="33" r="9" />
        <path className="ch-ink" d="M77 66c-3-20 6-31 23-31s26 11 23 31c-4-13-10-18-23-18s-19 5-23 18z" />
        <path className="ch-streak" d="M86 42c5-4 10-5 15-5M92 30c3-2 6-3 9-3" />
      </g>
    );
  }
  if (age >= 30) {
    return <path className="ch-ink" d="M76 86c-5-34 6-52 24-52s29 18 24 52c-2-22-8-34-24-34s-22 12-24 34z" />;
  }
  return (
    <g>
      <path className="ch-ink" d="M77 66c-3-20 6-32 23-32s26 12 23 32c-4-13-10-18-23-18s-19 5-23 18z" />
      <path className="ch-ink" d="M120 44c14 2 20 16 14 38-1-14-6-22-14-26z" />
    </g>
  );
}

function Outfit({ outfit }: { outfit: string }) {
  switch (outfit) {
    case "blazer":
      return (
        <g>
          <path className="ch-ink" d="M72 98c8-6 18-8 28-8s20 2 28 8l6 70H66z" />
          <path className="ch-paper" d="M92 91l8 16 8-16-8 5z" />
          <path className="ch-line-inv" d="M100 107v61M92 91l8 28 8-28" />
          <path className="ch-cloth" d="M80 168h40l4 44h-18l-6-30-6 30H76z" />
        </g>
      );
    case "sari":
      return (
        <g>
          <path className="ch-cloth" d="M72 98c8-6 18-8 28-8s20 2 28 8l10 114H62z" />
          <path className="ch-ink" d="M128 98c-6-5-14-7-22-8-8 34-24 62-44 84l-2 38h20c22-26 40-66 48-114z" />
          <path className="ch-line" d="M82 212v-20M92 212v-28M102 212v-36" />
        </g>
      );
    case "shawl":
      return (
        <g>
          <path className="ch-cloth" d="M72 98c8-6 18-8 28-8s20 2 28 8l8 114H64z" />
          <path className="ch-ink" d="M66 100c10-8 22-10 34-10s24 2 34 10l8 52c-14-6-28-18-42-40-14 22-28 34-42 40z" />
          <path className="ch-line-inv" d="M70 140l6-6M78 132l6-6M124 132l6 6M116 126l6 6" />
        </g>
      );
    default:
      return (
        <g>
          <path className="ch-cloth" d="M72 98c8-6 18-8 28-8s20 2 28 8l8 86H64z" />
          <path className="ch-line" d="M92 91l8 14 8-14M100 105v24" />
          <path className="ch-ink" d="M80 184h16l-2 28H78zM104 184h16l2 28h-16z" />
        </g>
      );
  }
}

function Extra({ extra }: { extra: string }) {
  switch (extra) {
    case "glasses":
      return <path className="ch-line" d="M86 62a7 7 0 1 0 14 0 7 7 0 1 0-14 0zM100 62a7 7 0 1 0 14 0 7 7 0 1 0-14 0zM86 62h-7M114 62h7" />;
    case "bag":
      return (
        <g>
          <path className="ch-line" d="M124 96l-50 70" />
          <rect className="ch-ink" x="56" y="160" width="26" height="22" rx="4" />
        </g>
      );
    case "scarf":
      return <path className="ch-ink" d="M84 88c10 6 22 6 32 0l2 8c-10 6-26 6-36 0zM106 96l10 30-9 3-8-30z" />;
    case "watch":
      return <rect className="ch-ink" x="138" y="140" width="9" height="7" rx="2" />;
    default:
      return null;
  }
}

export function Character({
  look,
  age = 22,
  size = 200,
  label,
  bare,
}: {
  look: Look;
  age?: number;
  size?: number;
  /** Spoken description. Leave it out when the figure sits beside text that already says who she is. */
  label?: string;
  /** No background scene: just the figure. */
  bare?: boolean;
}) {
  return (
    <svg
      className="character"
      viewBox="0 0 200 228"
      width={size}
      height={(size * 228) / 200}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {!bare && <Place place={look.place} />}
      <path className="ch-ground" d="M10 214h180" />
      {/* arms */}
      <path className="ch-limb" d="M74 102c-8 14-12 30-14 46M126 102c8 14 12 30 14 46" />
      <circle className="ch-paper" cx="60" cy="151" r="5" />
      <circle className="ch-paper" cx="140" cy="151" r="5" />
      <Outfit outfit={look.outfit} />
      {/* neck and head */}
      <path className="ch-paper" d="M94 80h12v12c-4 3-8 3-12 0z" />
      <circle className="ch-paper" cx="100" cy="62" r="22" />
      <Hair age={age} />
      <circle className="ch-dot" cx="92" cy="63" r="1.8" />
      <circle className="ch-dot" cx="108" cy="63" r="1.8" />
      <path className="ch-line" d="M93 72c4 4 10 4 14 0" />
      <Extra extra={look.extra} />
    </svg>
  );
}
