/** Draws the milestone card as a square picture, on the phone, for sharing. */
export async function milestoneImage(input: {
  kicker: string;
  line: string;
  title: string;
  credit: string;
  font: string;
  headFont: string;
}): Promise<Blob | null> {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#010713";
  ctx.fillRect(0, 0, size, size);
  const glow = ctx.createRadialGradient(size / 2, 120, 40, size / 2, 120, 760);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.16)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, size - 96, size - 96);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f6f8fc";
  ctx.font = `600 64px ${input.headFont}`;
  ctx.fillText("Saath", size / 2, 190);

  ctx.fillStyle = "#b4c0d6";
  ctx.font = `600 34px ${input.font}`;
  ctx.fillText(input.kicker, size / 2, 330);

  ctx.fillStyle = "#f6f8fc";
  ctx.font = `600 68px ${input.headFont}`;
  const words = input.line.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > size - 240 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  const lineHeight = 96;
  const top = 560 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((text, index) => ctx.fillText(text, size / 2, top + index * lineHeight));

  ctx.fillStyle = "rgba(246, 248, 252, 0.78)";
  ctx.font = `500 34px ${input.font}`;
  ctx.fillText(input.title, size / 2, 880);
  ctx.fillStyle = "rgba(246, 248, 252, 0.55)";
  ctx.font = `400 24px ${input.font}`;
  ctx.fillText(input.credit, size / 2, 980);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
