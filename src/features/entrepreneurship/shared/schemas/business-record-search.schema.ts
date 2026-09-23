import { z } from "zod";
export const businessRecordSearchSchema = z.object({
  kind: z.enum([
    "person",
    "company",
    "segment",
    "interaction",
    "observation",
    "problem",
    "source",
  ]),
  nicheId: z.string().max(100).optional(),
  q: z.string().max(200).optional(),
  cursor: z.string().max(1000).optional(),
  interactionKinds: z
    .array(
      z.enum([
        "OUTREACH_SENT",
        "REPLY_RECEIVED",
        "CONVERSATION",
        "ATTEMPT_NO_CONTACT",
      ]),
    )
    .max(4)
    .optional(),
  selectedIds: z.array(z.string().max(100)).max(100).default([]),
});
export type BusinessRecordSearch = z.input<typeof businessRecordSearchSchema>;
export type BusinessRecordOption = {
  id: string;
  name: string;
  revisionId?: string;
  marketType?: string;
  description?: string | null;
};
