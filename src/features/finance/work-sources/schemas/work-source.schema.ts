import { z } from "zod";
import {
  financeName,
  financeNotes,
} from "@/features/finance/schemas/finance.schema";
export const compensationSchema = z.enum([
  "HOURLY",
  "FIXED",
  "TASK_BASED",
  "UNKNOWN",
]);
export const workSourceSchema = z.object({
  name: financeName,
  type: z.enum(["EMPLOYER", "CLIENT", "PLATFORM", "OTHER"]),
  defaultCompensationType: compensationSchema.default("UNKNOWN"),
  notes: financeNotes,
});
