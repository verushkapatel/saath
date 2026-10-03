import { EXTRACT_MAX_CHARS } from "@/lib/config";
import { extractWithModel, llmProvider } from "@/lib/llm";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { redact } from "@/lib/redact";
import { extractionSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request.headers.get("x-forwarded-for")), 20, 60_000)) {
    return Response.json({ error: "slow" }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { text?: string; lang?: string; extraction?: unknown } | null;
  if (!body) return Response.json({ error: "bad" }, { status: 400 });

  if (body.extraction) {
    const parsed = extractionSchema.safeParse(body.extraction);
    if (!parsed.success) return Response.json({ error: "bad" }, { status: 400 });
    return Response.json({ extraction: parsed.data });
  }

  if (!body.text || typeof body.text !== "string") return Response.json({ error: "bad" }, { status: 400 });
  if (body.text.length > EXTRACT_MAX_CHARS) return Response.json({ error: "big" }, { status: 413 });
  if (!llmProvider()) return Response.json({ error: "off" }, { status: 501 });

  const extraction = await extractWithModel(redact(body.text), body.lang ?? "en");
  if (!extraction) return Response.json({ error: "fallback" }, { status: 503 });
  return Response.json({ extraction });
}
