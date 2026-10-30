import { resolve } from "node:path";
import { copyFile } from "node:fs/promises";
import { runOfficialReferenceTrial } from "../src/features/seasons/discovery/trial/official-references/runner";
const mode = process.argv[2];
if (!["--run", "--refresh"].includes(mode) || process.argv.length !== 3) {
  console.error(
    "Usage: pnpm exec tsx tools/official-reference-trial.ts --run | --refresh",
  );
  process.exitCode = 1;
} else {
  try {
    const directory = resolve(".data/become/official-reference-trial-v1");
    const report = await runOfficialReferenceTrial({
      directory,
      fresh: mode === "--refresh",
    });
    for (const c of report.characters)
      console.log(
        `${c.name}: ${c.gate}, ${c.references.length} inspected references, ${Math.round(c.milliseconds)} ms. ${c.warnings.join(" ")}`,
      );
    console.log(
      `Total: ${Math.round(report.milliseconds)} ms, ${report.requests} requests, ${report.cacheHits} cache hits; ${report.gate}. No model/search/image-provider calls.`,
    );
    await copyFile(
      resolve(directory, "report.json"),
      resolve(directory, `${report.requests ? "cold" : "warm"}-report.json`),
    );
    if (report.gate !== "PASS") process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Trial failed");
    process.exitCode = 1;
  }
}
