/**
 * Square pictures for sharing, drawn on the phone. Black ink on white paper only: the same identity as the app.
 * Nothing in them comes from Money Lab. They hold only what the share sheet shows in its preview.
 */
const SIZE = 1080;
const INK = "#0a0a0a";
const PAPER = "#ffffff";
const MUTED = "#3d3d3d";
const FAINT = "#6a6a6a";

function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  const element = document.createElement("canvas");
  element.width = SIZE;
  element.height = SIZE;
  const ctx = element.getContext("2d");
  return ctx ? [element, ctx] : null;
}

function frame(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, SIZE - 96, SIZE - 96);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(60, 60, SIZE - 120, SIZE - 120);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const toBlob = (element: HTMLCanvasElement) => new Promise<Blob | null>((resolve) => element.toBlob(resolve, "image/png"));

/** Draws the milestone card for a finished path. */
export async function milestoneImage(input: {
  kicker: string;
  line: string;
  title: string;
  credit: string;
  font: string;
  headFont: string;
}): Promise<Blob | null> {
  const made = canvas();
  if (!made) return null;
  const [element, ctx] = made;
  frame(ctx);
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = `700 64px ${input.headFont}`;
  ctx.fillText("Saath", SIZE / 2, 190);
  ctx.fillStyle = MUTED;
  ctx.font = `600 34px ${input.font}`;
  ctx.fillText(input.kicker.toUpperCase(), SIZE / 2, 330);
  ctx.fillStyle = INK;
  ctx.font = `600 68px ${input.headFont}`;
  const lines = wrap(ctx, input.line, SIZE - 240);
  const top = 560 - ((lines.length - 1) * 96) / 2;
  lines.forEach((text, index) => ctx.fillText(text, SIZE / 2, top + index * 96));
  ctx.fillStyle = MUTED;
  ctx.font = `500 34px ${input.font}`;
  ctx.fillText(input.title, SIZE / 2, 880);
  ctx.fillStyle = FAINT;
  ctx.font = `400 24px ${input.font}`;
  ctx.fillText(input.credit, SIZE / 2, 980);
  return toBlob(element);
}

/**
 * Turns the character drawing on screen into an image. Its colours come from the theme's CSS,
 * so each shape is given the light theme's ink and paper explicitly before it is drawn.
 */
async function svgImage(svg: SVGSVGElement): Promise<HTMLImageElement | null> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const paint: Record<string, [string, string, string]> = {
    "ch-scene": ["none", "#b5b5b5", "1.5"],
    "ch-ground": ["none", "#b5b5b5", "1.5"],
    "ch-limb": ["none", INK, "2"],
    "ch-paper": [PAPER, INK, "2"],
    "ch-cloth": ["#e4e4e4", INK, "2"],
    "ch-ink": [INK, INK, "1"],
    "ch-line": ["none", INK, "1.75"],
    "ch-line-inv": ["none", PAPER, "1.5"],
    "ch-streak": ["none", PAPER, "1.5"],
    "ch-dot": [INK, "none", "0"],
  };
  copy.querySelectorAll("*").forEach((node) => {
    const element = node as SVGElement;
    const own = [...element.classList].find((name) => name in paint);
    const parent = element.closest("[class*='ch-scene']");
    const style = own ? paint[own] : parent ? paint["ch-scene"] : null;
    if (!style) return;
    element.setAttribute("fill", style[0]);
    element.setAttribute("stroke", style[1]);
    element.setAttribute("stroke-width", style[2]);
    element.setAttribute("stroke-linecap", "round");
    element.setAttribute("stroke-linejoin", "round");
  });
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", "400");
  copy.setAttribute("height", "456");
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" }));
  try {
    return await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export type ProgressCard = {
  level: string;
  streak: string;
  stage: string;
  badge: string | null;
  credit: string;
  font: string;
  headFont: string;
};

/** The progress card: the character, level, streak, story stage and newest badge. Nothing else. */
export async function progressImage(card: ProgressCard, character: SVGSVGElement | null): Promise<Blob | null> {
  const made = canvas();
  if (!made) return null;
  const [element, ctx] = made;
  frame(ctx);
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `700 60px ${card.headFont}`;
  ctx.fillText("Saath", 110, 170);

  const picture = character ? await svgImage(character) : null;
  if (picture) ctx.drawImage(picture, 90, 240, 400, 456);

  const x = 540;
  ctx.fillStyle = INK;
  ctx.font = `700 76px ${card.headFont}`;
  wrap(ctx, card.level, 440).forEach((text, index) => ctx.fillText(text, x, 360 + index * 84));
  ctx.font = `500 40px ${card.font}`;
  ctx.fillStyle = MUTED;
  let y = 480;
  for (const line of [card.streak, card.stage, card.badge].filter((item): item is string => Boolean(item))) {
    for (const text of wrap(ctx, line, 440)) {
      ctx.fillText(text, x, y);
      y += 54;
    }
    y += 18;
  }
  ctx.fillStyle = INK;
  ctx.fillRect(110, 860, SIZE - 220, 3);
  ctx.fillStyle = FAINT;
  ctx.font = `400 28px ${card.font}`;
  ctx.fillText(card.credit, 110, 930);
  return toBlob(element);
}
