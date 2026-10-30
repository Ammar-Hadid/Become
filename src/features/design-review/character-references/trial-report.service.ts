import "server-only";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { reportSchema } from "@/features/seasons/discovery/trial/official-references/types";
export const trialDirectory = resolve(
  ".data/become/official-reference-trial-v1",
);
export async function readOfficialTrialReport() {
  const text = await readFile(resolve(trialDirectory, "report.json"), "utf8");
  return reportSchema.parse(JSON.parse(text));
}
