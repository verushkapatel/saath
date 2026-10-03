import { z } from "zod";

export const textFieldSchema = z.object({
  value: z.string().nullable(),
  unclear: z.boolean(),
  clause: z.string().nullable(),
});

export const numberFieldSchema = z.object({
  value: z.number().nullable(),
  unclear: z.boolean(),
  clause: z.string().nullable(),
});

export const rateTypeSchema = z.object({
  value: z.enum(["flat", "reducing"]).nullable(),
  unclear: z.boolean(),
  clause: z.string().nullable(),
});

export const extractionSchema = z.object({
  documentType: z.enum(["personal_loan", "gold_loan", "scheme_form", "other"]),
  lender: textFieldSchema,
  principal: numberFieldSchema,
  interestRate: numberFieldSchema,
  rateType: rateTypeSchema,
  tenureMonths: numberFieldSchema,
  processingFee: numberFieldSchema,
  otherFees: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
      clause: z.string().nullable(),
    }),
  ),
  penaltyTerms: z.array(
    z.object({
      text: z.string(),
      clause: z.string().nullable(),
      monthlyPercent: z.number().nullable(),
    }),
  ),
  prepaymentTerms: textFieldSchema,
  prepaymentAllowed: z.boolean().nullable(),
  collateral: textFieldSchema,
  blanksToFill: z.array(z.string()),
  sourceText: z.string(),
});

export type Extraction = z.infer<typeof extractionSchema>;
export type TextField = z.infer<typeof textFieldSchema>;
export type NumberField = z.infer<typeof numberFieldSchema>;

export function blankText(): TextField {
  return { value: null, unclear: true, clause: null };
}

export function blankNumber(): NumberField {
  return { value: null, unclear: true, clause: null };
}
