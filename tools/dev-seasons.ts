import "./season-environment";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const children = [
  spawn(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "dev", "-p", "3010"],
    { stdio: "inherit" },
  ),
  spawn(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "tools/season-onboarding-worker.ts",
    ],
    { stdio: "inherit" },
  ),
];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children)
    if (child.exitCode === null) child.kill("SIGTERM");
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
await Promise.all(
  children.map(
    (child) =>
      new Promise<void>((resolve) => {
        child.on("error", () => {
          process.exitCode = 1;
          stop();
          resolve();
        });
        child.on("exit", (code) => {
          if (!stopping) {
            process.exitCode = code || 1;
            console.error(
              "The app or Season worker stopped; shutting down its companion. Fix the reported issue, then restart pnpm dev:seasons.",
            );
            stop();
          }
          resolve();
        });
      }),
  ),
);
