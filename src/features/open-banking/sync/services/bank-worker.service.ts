import "dotenv/config";
import { setTimeout as wait } from "node:timers/promises";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  scheduleDueBankSynchronizations,
  runNextBankSynchronization,
} from "./bank-sync.service";

let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});

async function main() {
  let lastSchedule = 0;
  while (!stopping) {
    try {
      if (Date.now() - lastSchedule >= 60_000) {
        await scheduleDueBankSynchronizations();
        lastSchedule = Date.now();
      }
      if (!(await runNextBankSynchronization())) await wait(5000);
    } catch {
      // Log no source payloads, tokens, account identifiers, or provider error bodies.
      console.error("Bank synchronization worker cycle failed; retrying.");
      await wait(30_000);
    }
  }
}
main().finally(() => prisma.$disconnect());
