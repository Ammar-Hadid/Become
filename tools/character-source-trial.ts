import { config } from "dotenv";
import { resolve } from "node:path";
import { runCharacterSourceTrial } from "../src/features/seasons/discovery/trial/character-source-trial";

config({ path: [".env.local", ".env"], quiet: true });
const mode = process.argv[2];
if (process.argv.length !== 3 || !["--check", "--run"].includes(mode)) {
  console.error(
    "Usage: pnpm exec tsx tools/character-source-trial.ts --check | --run",
  );
  process.exitCode = 1;
} else if (mode === "--check") {
  console.log(
    process.env.TAVILY_API_KEY?.trim()
      ? "TAVILY_API_KEY is configured. No requests made. Ensure paid usage is disabled in Tavily before --run."
      : "TAVILY_API_KEY is missing. Add a free key to .env; no requests made.",
  );
} else {
  const directory = resolve(".data/become/character-source-trial-v1");
  try {
    const report = await runCharacterSourceTrial({
      apiKey: process.env.TAVILY_API_KEY ?? "",
      directory,
    });
    for (const item of report.characters) {
      console.log(
        `${item.label}: ${item.images.length} distinct source-bound candidates; ` +
          `${item.searches.filter((search) => !search.cacheHit).length} searches dispatched; ` +
          `${item.searches.filter((search) => search.status !== "READY").length} failed/incomplete. ` +
          "Authenticity, adaptation, dimensions and likeness still need inspection.",
      );
    }
    console.log(`Report: ${directory}/report.json`);
    console.log(
      `Elapsed: ${Math.round(report.milliseconds)} ms. Quality gate: ${report.qualityGate}.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Trial failed.");
    process.exitCode = 1;
  }
}
