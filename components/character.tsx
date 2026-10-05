import type { Look } from "@/lib/progress";

/**
 * Verena, drawn as a flat illustration. Her colours are fixed (skin, hair, navy, white and grey clothes), so she looks
 * the same in light and dark themes and in a shared picture. Only the scene behind her follows the theme.
 *
 * - Her hair changes with her age in the story: a ponytail at 19, shoulder-length in her thirties, a bun later, grey at 60.
 * - Her face shows a mood: neutral, happy, worried or proud. Episodes use it to show how a decision turned out.
 * - Outfits, extras and places are unlocked as rewards (lib/rewards.ts).
 */

export type Mood = "neutral" | "happy" | "worried" | "proud";

/** Body proportions by age: a child is smaller with a bigger head, a teenager a little smaller than an adult. */
function bodyScale(age: number): number {
  if (age < 13) return 0.74;
  if (age < 17) return 0.88;
  return 1;
}

/** A darker shade of a tint, for lapels, seams and trousers. */
function shade(hex: string, amount = 0.28): string {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return hex;
  const n = parseInt(value, 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `#${[16, 8, 0].map((shift) => ch(shift).toString(16).padStart(2, "0")).join("")}`;
}

const SKIN = "#C98F65";
const SKIN_SHADE = "#B47A52";
const CHEEK = "#E08A72";
const INK = "#1B1B1F";
const NAVY = "#22468F";
const NAVY_DARK = "#152E63";
const WHITE = "#F6F6F4";
const GREY = "#8C929C";
const GREY_DARK = "#5F6570";
/** A faint edge on white clothes, so they do not disappear against a white page. */
const EDGE = "#D3D6DC";

function Place({ place }: { place: string }) {
  switch (place) {
    case "office":
      return (
        <g className="ch-scene">
          <rect x="14" y="52" width="46" height="34" rx="4" />
          <path d="M14 68h46M37 52v34" />
          <rect x="146" y="120" width="40" height="28" rx="3" />
          <path d="M166 148v14M154 162h24" />
          <path d="M140 162h52" />
        </g>
      );
    case "bank":
      return (
        <g className="ch-scene">
          <path d="M12 92 42 72l30 20M18 92v70M30 92v70M54 92v70M66 92v70M12 162h60" />
          <rect x="146" y="128" width="42" height="34" rx="3" />
          <circle cx="167" cy="145" r="6" />
          <path d="M167 139v12M161 145h12" />
        </g>
      );
    case "home":
      return (
        <g className="ch-scene">
          <rect x="16" y="58" width="40" height="30" rx="3" />
          <path d="M22 82l9-10 7 7 5-5 7 8" />
          <path d="M140 170v-22a8 8 0 0 1 8-8h32a8 8 0 0 1 8 8v22M134 170v16h60v-16M134 170h60" />
        </g>
      );
    case "garden":
      return (
        <g className="ch-scene">
          <path d="M32 212v-66" />
          <path d="M32 150c-22 0-26-26-10-36-6-20 20-30 28-14 18-6 28 18 14 30 6 14-10 24-32 20z" />
          <path d="M148 188h42M152 188v22M186 188v22M148 176h42" />
          <circle cx="170" cy="56" r="12" />
        </g>
      );
    case "cafe":
      return (
        <g className="ch-scene">
          <path d="M12 48h56l-6 12H18z" />
          <path d="M18 60v12M30 60v12M42 60v12M54 60v12" />
          <rect x="16" y="72" width="44" height="36" rx="3" />
          <path d="M146 158h44M168 158v52M156 210h24" />
          <path d="M158 148h12v10h-12zM170 151h4a3 3 0 0 1 0 6h-4" />
        </g>
      );
    case "rooftop":
      return (
        <g className="ch-scene">
          <path d="M8 150v-40h16v40M24 150v-62h18v62M42 150v-28h14v28M146 150v-52h16v52M162 150v-34h18v34M180 150v-58h14v58" />
          <path d="M8 40q46 18 92 0t92 0" />
          <circle cx="31" cy="46" r="2" /><circle cx="62" cy="47" r="2" /><circle cx="138" cy="47" r="2" /><circle cx="169" cy="46" r="2" />
        </g>
      );
    default:
      return (
        <g className="ch-scene">
          <rect x="16" y="54" width="44" height="54" rx="4" />
          <path d="M38 54v54M16 81h44" />
          <path d="M144 108h44M144 138h44M148 108v-12h8v12M160 108v-18h7v18M172 108v-9h8v9M150 138v-10h14v10" />
        </g>
      );
  }
}

/** Hair behind the head: drawn first, so the face sits in front of it. */
function HairBack({ age }: { age: number }) {
  const colour = age >= 60 ? "#B9BBC0" : INK;
  if (age < 13) {
    return (
      <g fill={colour}>
        <path d="M80 50c-9 0-14 8-13 18 1 5 5 8 9 7-3-7-1-17 4-25z" />
        <path d="M120 50c9 0 14 8 13 18-1 5-5 8-9 7 3-7 1-17-4-25z" />
        <circle cx="70" cy="56" r="3" fill={NAVY} />
        <circle cx="130" cy="56" r="3" fill={NAVY} />
      </g>
    );
  }
  if (age >= 46) return <circle cx="100" cy="36" r="11" fill={colour} />;
  if (age >= 26) return <path d="M78 62c-2-26 8-40 22-40s24 14 22 40l2 26c-6 4-12 4-16 0V62H92v26c-4 4-10 4-16 0z" fill={colour} />;
  return (
    <g fill={colour}>
      <path d="M120 46c16 4 22 20 14 44-2-16-8-26-16-30z" />
    </g>
  );
}

/** Hair over the forehead. */
function HairFront({ age }: { age: number }) {
  const colour = age >= 60 ? "#B9BBC0" : INK;
  if (age < 13) return <path d="M79 64c-1-24 9-36 21-36s22 12 21 36c-3-6-6-10-10-12-4 4-14 6-24 4-4 2-6 4-8 8z" fill={colour} />;
  const front = <path d="M79 62c-1-22 9-34 21-34s22 12 21 34c-5-12-12-17-21-17-6 0-11 3-14 8-2-3-5-2-7 9z" fill={colour} />;
  if (age >= 50 && age < 60) {
    return (
      <g>
        {front}
        <path d="M88 34c5-3 10-4 15-3" stroke="#C8CACE" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  return front;
}

function Face({ mood }: { mood: Mood }) {
  const brows =
    mood === "worried" ? "M88 59.5q4-1 8-3.5M112 59.5q-4-1-8-3.5" : mood === "proud" ? "M88 58q4-3 8-1M104 57q4-2 8 1" : "M88 58q4-2 8 0M104 58q4-2 8 0";
  const eyes =
    mood === "happy" || mood === "proud" ? (
      <g stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M89.5 65q3-3 6 0M104.5 65q3-3 6 0" />
      </g>
    ) : (
      <g className="ch-eyes">
        <ellipse cx="92.5" cy="65" rx="2.3" ry="2.9" fill={INK} />
        <ellipse cx="107.5" cy="65" rx="2.3" ry="2.9" fill={INK} />
        <circle cx="93.3" cy="64" r="0.8" fill="#fff" />
        <circle cx="108.3" cy="64" r="0.8" fill="#fff" />
      </g>
    );
  const mouth =
    mood === "happy" ? (
      <path d="M93.5 74.5q6.5 7 13 0z" fill="#7A2E2A" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
    ) : mood === "worried" ? (
      <path d="M95 77.5q5-3.5 10 0" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    ) : mood === "proud" ? (
      <path d="M94 74.5q6 5 12 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
    ) : (
      <path d="M95 75q5 3.5 10 0" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    );
  return (
    <g>
      <path d={brows} stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {eyes}
      <path d="M100.5 68q1.5 3-1 4" stroke={SKIN_SHADE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="87" cy="72" r="3.2" fill={CHEEK} opacity="0.35" />
      <circle cx="113" cy="72" r="3.2" fill={CHEEK} opacity="0.35" />
      {mouth}
    </g>
  );
}

/** Arms, hands and legs come in the skin colour; sleeves and trousers are drawn by each outfit. */
function Limbs() {
  return (
    <g fill={SKIN}>
      <circle cx="64" cy="148" r="5.5" />
      <circle cx="136" cy="148" r="5.5" />
    </g>
  );
}

function Shoes({ colour = INK }: { colour?: string }) {
  return <path d="M80 208h16v5H78zM104 208h16l2 5h-18z" fill={colour} />;
}

function Outfit({ outfit, tint }: { outfit: string; tint?: string }) {
  const sleeves = (fill: string) => <path d="M77 100 64 142l8 3 11-34zM123 100l13 42-8 3-11-34z" fill={fill} />;
  const main = tint ?? NAVY;
  const dark = shade(main);
  switch (outfit) {
    case "uniform":
      return (
        <g>
          <path d="M86 186h12v22H87zM102 186h12v22h-11z" fill={WHITE} stroke={EDGE} strokeWidth="1" />
          <Shoes />
          <path d="M80 99q20-8 40 0l2 40H78z" fill={WHITE} stroke={EDGE} strokeWidth="1" />
          <path d="M84 112h32l14 76H70z" fill={main} />
          <path d="M88 112v-10M112 112v-10" stroke={main} strokeWidth="4" strokeLinecap="round" />
          <path d="M97 98l3 14 3-14z" fill={dark} />
          {sleeves(WHITE)}
        </g>
      );
    case "frock":
      return (
        <g>
          <path d="M88 180h9v28h-9zM103 180h9v28h-9z" fill={SKIN} />
          <Shoes colour={main} />
          <path d="M80 99q20-8 40 0l18 86H62z" fill={main} />
          <path d="M66 176h68" stroke={WHITE} strokeWidth="2.4" />
          <path d="M92 94l8 8 8-8" fill="none" stroke={WHITE} strokeWidth="2.2" strokeLinejoin="round" />
          {sleeves(main)}
        </g>
      );
    case "tee":
      return (
        <g>
          <path d="M83 168h15l-1 40H85zM102 168h15l-1 40h-13z" fill="#3F5A86" />
          <Shoes colour={WHITE} />
          <path d="M78 99q22-9 44 0l3 72H75z" fill={main} />
          <path d="M92 95q8 6 16 0" fill="none" stroke={dark} strokeWidth="2" />
          <path d="M77 100 66 126l9 4 6-18zM123 100l11 26-9 4-6-18z" fill={main} />
          <path d="M66 126 64 142l8 3 3-15zM134 126l2 16-8 3-3-15z" fill={SKIN} />
        </g>
      );
    case "shirt":
      return (
        <g>
          <path d="M84 176h14l-1 32H85zM102 176h14l-1 32h-12z" fill={GREY_DARK} />
          <Shoes />
          <path d="M78 99q22-9 44 0l4 78H74z" fill={main} />
          <path d="M90 95l10 10 10-10-4-3-6 5-6-5z" fill={WHITE} stroke={EDGE} strokeWidth="1" />
          <path d="M100 106v66" stroke={dark} strokeWidth="1.6" />
          <circle cx="100" cy="122" r="1.4" fill={WHITE} /><circle cx="100" cy="140" r="1.4" fill={WHITE} /><circle cx="100" cy="158" r="1.4" fill={WHITE} />
          {sleeves(main)}
        </g>
      );
    case "cardigan":
      return (
        <g>
          <path d="M84 176h14l-1 32H85zM102 176h14l-1 32h-12z" fill={INK} />
          <Shoes />
          <path d="M80 99q20-8 40 0l2 78H78z" fill={WHITE} stroke={EDGE} strokeWidth="1" />
          <path d="M78 99q10-4 17-5l1 83H74zM122 99q-10-4-17-5l-1 83h22z" fill={main} />
          <path d="M77 168h21M102 168h21" stroke={dark} strokeWidth="2" />
          {sleeves(main)}
        </g>
      );
    case "coat":
      return (
        <g>
          <path d="M86 190h12v18H87zM102 190h12v18h-11z" fill={INK} />
          <Shoes />
          <path d="M78 99q22-9 44 0l8 92H70z" fill={main} />
          <path d="M100 104v86" stroke={dark} strokeWidth="2" />
          <path d="M88 96l12 14 12-14" fill="none" stroke={dark} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="94" cy="130" r="1.8" fill={dark} /><circle cx="94" cy="150" r="1.8" fill={dark} /><circle cx="106" cy="130" r="1.8" fill={dark} /><circle cx="106" cy="150" r="1.8" fill={dark} />
          <path d="M74 160h52" stroke={dark} strokeWidth="2" />
          {sleeves(main)}
        </g>
      );
    case "blazer":
      return (
        <g>
          <path d="M84 178h14l-1 30H85zM102 178h14l-1 30h-12z" fill={GREY_DARK} />
          <Shoes />
          <path d="M78 99q22-9 44 0l4 80H74z" fill={WHITE} stroke={EDGE} strokeWidth="1" />
          <path d="M78 99q10-4 18-5l4 22-6 62H74zM122 99q-10-4-18-5l-4 22 6 62h20z" fill={tint ? dark : NAVY_DARK} />
          <path d="M96 94l4 14 4-14" fill="none" stroke={main} strokeWidth="2" />
          {sleeves(tint ? dark : NAVY_DARK)}
        </g>
      );
    case "sari":
      return (
        <g>
          <path d="M76 120h48l10 92H66z" fill={WHITE} stroke={EDGE} strokeWidth="1" />
          <path d="M67 202h66l1 10H66z" fill={main} />
          <path d="M78 99q22-9 44 0l2 24H76z" fill={main} />
          <path d="M122 98c-6-4-12-5-18-6-8 40-24 70-40 86l-2 30h18c18-26 36-66 42-110z" fill={WHITE} stroke={EDGE} strokeWidth="1" />
          <path d="M104 92c-8 40-24 70-40 86" fill="none" stroke={main} strokeWidth="3" />
          {sleeves(main)}
        </g>
      );
    case "shawl":
      return (
        <g>
          <path d="M84 178h14v30H85zM102 178h14v30h-13z" fill={WHITE} stroke={EDGE} strokeWidth="1" />
          <Shoes />
          <path d="M78 99q22-9 44 0l6 80H72z" fill={GREY} />
          {sleeves(GREY)}
          <path d="M70 100q30-14 60 0l6 48c-14-6-26-16-36-36-10 20-22 30-36 36z" fill={NAVY} />
          <path d="M74 140l4-5M80 134l4-5M120 134l4 5M126 140l4 5" stroke={WHITE} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case "hoodie":
      return (
        <g>
          <path d="M83 172h15l-1 36H85zM102 172h15l-1 36h-13z" fill="#2C4A80" />
          <Shoes colour={WHITE} />
          <path d="M84 96q16-8 32 0l-4 8q-12-5-24 0z" fill={tint ? dark : "#7E848E"} />
          <path d="M78 99q22-9 44 0l4 74H74z" fill={tint ?? "#9AA0AA"} />
          <path d="M88 150h24v12H88z" fill={tint ? dark : "#878D97"} />
          <path d="M96 104v18M104 104v18" stroke={WHITE} strokeWidth="1.6" strokeLinecap="round" />
          {sleeves(tint ?? "#9AA0AA")}
        </g>
      );
    case "jacket":
      return (
        <g>
          <path d="M83 172h15l-1 36H85zM102 172h15l-1 36h-13z" fill={INK} />
          <Shoes />
          <path d="M80 99q20-8 40 0l2 74H78z" fill={WHITE} stroke={EDGE} strokeWidth="1" />
          <path d="M78 99q10-4 16-5l2 79H74zM122 99q-10-4-16-5l-2 79h22z" fill={tint ?? "#3A5A99"} />
          <path d="M80 130h12M108 130h12" stroke={tint ? dark : "#2A467E"} strokeWidth="2" />
          {sleeves(tint ?? "#3A5A99")}
        </g>
      );
    case "suit":
      return (
        <g>
          <path d="M84 176h14l-1 32H85zM102 176h14l-1 32h-12z" fill="#1C1C1E" />
          <Shoes />
          <path d="M78 99q22-9 44 0l4 78H74z" fill="#1C1C1E" />
          <path d="M94 95l6 20 6-20z" fill={WHITE} stroke={EDGE} strokeWidth="1" />
          <path d="M94 95l6 20M106 95l-6 20" stroke="#3A3A3E" strokeWidth="1.5" />
          {tint && <circle cx="112" cy="112" r="2.4" fill={tint} />}
          {sleeves("#1C1C1E")}
        </g>
      );
    case "festive":
      return (
        <g>
          <path d="M76 124h48l14 88H62z" fill={NAVY} />
          <path d="M68 196h64M66 204h68" stroke={WHITE} strokeWidth="1.6" />
          <circle cx="84" cy="160" r="1.6" fill={WHITE} /><circle cx="100" cy="170" r="1.6" fill={WHITE} /><circle cx="116" cy="160" r="1.6" fill={WHITE} />
          <circle cx="92" cy="186" r="1.6" fill={WHITE} /><circle cx="108" cy="186" r="1.6" fill={WHITE} />
          <path d="M78 99q22-9 44 0l2 26H76z" fill={WHITE} stroke={EDGE} strokeWidth="1" />
          <path d="M120 98c-6-3-10-4-14-4-6 30-18 52-32 64l-2 18c18-18 34-44 48-78z" fill="#3A5A99" opacity="0.92" />
          {sleeves(WHITE)}
        </g>
      );
    default:
      return (
        <g>
          <path d="M84 176h13l-1 32H85zM103 176h13v32h-12z" fill={WHITE} stroke={EDGE} strokeWidth="1" />
          <Shoes />
          <path d="M78 99q22-9 44 0l8 79H70z" fill={main} />
          <path d="M92 94l8 14 8-14" fill="none" stroke={WHITE} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M71 170h58" stroke={WHITE} strokeWidth="2" />
          {sleeves(main)}
        </g>
      );
  }
}

/** Things worn behind the body. */
function ExtraBack({ extra }: { extra: string }) {
  if (extra === "backpack") return <rect x="72" y="102" width="56" height="46" rx="10" fill={NAVY_DARK} />;
  return null;
}

const HEAD_EXTRAS = new Set(["glasses", "sunglasses", "earrings"]);

function Extra({ extra, part }: { extra: string; part: "head" | "body" }) {
  if (HEAD_EXTRAS.has(extra) !== (part === "head")) return null;
  switch (extra) {
    case "glasses":
      return <path d="M85 65a6 6 0 1 0 12 0 6 6 0 1 0-12 0zM103 65a6 6 0 1 0 12 0 6 6 0 1 0-12 0zM97 65h6M85 64h-5M115 64h5" stroke={INK} strokeWidth="1.6" fill="none" />;
    case "sunglasses":
      return (
        <g>
          <path d="M84 61h14v6a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5zM102 61h14v6a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z" fill={INK} />
          <path d="M98 63h4M84 62h-4M116 62h4" stroke={INK} strokeWidth="1.6" />
        </g>
      );
    case "bag":
      return (
        <g>
          <path d="M122 98 78 160" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
          <rect x="62" y="152" width="26" height="22" rx="5" fill={INK} />
          <path d="M66 160h18" stroke={GREY} strokeWidth="1.5" />
        </g>
      );
    case "backpack":
      return <path d="M84 98l-4 50M116 98l4 50" stroke={NAVY_DARK} strokeWidth="5" strokeLinecap="round" />;
    case "scarf":
      return <path d="M84 88q16 8 32 0l2 9q-18 8-36 0zM104 96l10 30-9 3-8-31z" fill={NAVY} />;
    case "watch":
      return <rect x="131" y="138" width="10" height="7" rx="2" fill={INK} />;
    case "earrings":
      return (
        <g fill={WHITE} stroke={GREY_DARK} strokeWidth="0.8">
          <circle cx="81" cy="76" r="2.4" />
          <circle cx="119" cy="76" r="2.4" />
        </g>
      );
    case "headphones":
      return (
        <g>
          <path d="M84 96q16 10 32 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="79" y="90" width="9" height="12" rx="4" fill={NAVY_DARK} />
          <rect x="112" y="90" width="9" height="12" rx="4" fill={NAVY_DARK} />
        </g>
      );
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
  mood = "neutral",
  alive,
  wave,
}: {
  look: Look & { tint?: string };
  age?: number;
  size?: number;
  /** Spoken description. Leave it out when the figure sits beside text that already says who she is. */
  label?: string;
  /** No background scene: just the figure. */
  bare?: boolean;
  mood?: Mood;
  /** Breathing and blinking, for the places where she is the centre of the screen. */
  alive?: boolean;
  /** One wave of the hand, for a celebration. */
  wave?: boolean;
}) {
  const scale = bodyScale(age);
  const rise = 115 * (1 - scale);
  const head = scale < 1 ? 0.94 : 1;
  const body = `translate(${(100 * (1 - scale)).toFixed(2)} ${(214 * (1 - scale)).toFixed(2)}) scale(${scale})`;
  const headMove = `translate(0 ${rise.toFixed(2)}) translate(100 94) scale(${head}) translate(-100 -94)`;
  return (
    <svg
      className={`character${alive ? " alive" : ""}${wave ? " waving" : ""}`}
      viewBox="0 0 200 228"
      width={size}
      height={(size * 228) / 200}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {!bare && <Place place={look.place} />}
      <path className="ch-ground" d="M10 214h180" />
      <ellipse className="ch-shadow" cx="100" cy="214" rx={38 * scale} ry="4" fill="#000" opacity="0.12" />
      <g className="ch-figure">
        <g transform={headMove}><g className="ch-head"><HairBack age={age} /></g></g>
        <g transform={body}>
          <ExtraBack extra={look.extra} />
          <g className="ch-arms"><Limbs /></g>
          <Outfit outfit={look.outfit} tint={look.tint} />
          <Extra extra={look.extra} part="body" />
        </g>
        {/* The position sits on the outer group; the nod animates the inner one, so CSS never replaces the position. */}
        <g transform={headMove}>
          <g className="ch-head">
          {/* Neck, ears and face */}
          <path d="M94 80h12v14c-4 3-8 3-12 0z" fill={SKIN_SHADE} />
          <circle cx="81" cy="66" r="4.2" fill={SKIN} />
          <circle cx="119" cy="66" r="4.2" fill={SKIN} />
          <ellipse cx="100" cy="63" rx="19.5" ry="21.5" fill={SKIN} />
          <HairFront age={age} />
          <Face mood={mood} />
          <Extra extra={look.extra} part="head" />
          </g>
        </g>
      </g>
    </svg>
  );
}
