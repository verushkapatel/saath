import { EXTRACT_MAX_CHARS } from "@/lib/config";
import { extractWithModel, llmProvider } from "@/lib/llm";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { redact } from "@/lib/redact";
import { readWithVision } from "@/lib/vision";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request.headers.get("x-forwarded-for")), 20, 60_000)) {
    return Response.json({ error: "slow" }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { image?: string; text?: string; lang?: string } | null;
  if (!body) return Response.json({ error: "bad" }, { status: 400 });

  let text = typeof body.text === "string" ? body.text : "";
  if (!text && typeof body.image === "string") {
    text = (await readWithVision(body.image)) ?? "";
  }
  if (!text) return Response.json({ error: "empty" }, { status: 422 });
  if (text.length > EXTRACT_MAX_CHARS) return Response.json({ error: "big" }, { status: 413 });

  const masked = redact(text);
  if (!llmProvider()) return Response.json({ text: masked, extraction: null });
  const extraction = await extractWithModel(masked, body.lang ?? "en");
  return Response.json({ text: masked, extraction });
}
