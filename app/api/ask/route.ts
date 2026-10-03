import { answerFromDocument } from "@/lib/ask";
import { EXTRACT_MAX_CHARS } from "@/lib/config";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { redact } from "@/lib/redact";
import { extractionSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request.headers.get("x-forwarded-for")), 30, 60_000)) {
    return Response.json({ error: "slow" }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { question?: string; extraction?: unknown; text?: string } | null;
  if (!body?.question || typeof body.question !== "string") {
    return Response.json({ error: "bad" }, { status: 400 });
  }

  const parsed = extractionSchema.safeParse(
    body.extraction ?? {
      documentType: "other",
      lender: { value: null, unclear: true, clause: null },
      principal: { value: null, unclear: true, clause: null },
      interestRate: { value: null, unclear: true, clause: null },
      rateType: { value: null, unclear: true, clause: null },
      tenureMonths: { value: null, unclear: true, clause: null },
      processingFee: { value: null, unclear: true, clause: null },
      otherFees: [],
      penaltyTerms: [],
      prepaymentTerms: { value: null, unclear: true, clause: null },
      prepaymentAllowed: null,
      collateral: { value: null, unclear: true, clause: null },
      blanksToFill: [],
      sourceText: typeof body.text === "string" ? redact(body.text).slice(0, EXTRACT_MAX_CHARS) : "",
    },
  );
  if (!parsed.success) return Response.json({ error: "bad" }, { status: 400 });
  return Response.json({ answer: answerFromDocument(body.question, parsed.data) });
}
