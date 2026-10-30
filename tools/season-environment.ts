import { createRequire } from "node:module";
import { dirname } from "node:path";

// Match Next's .env.local/.env.development/.env precedence outside the Next process.
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require(
  require.resolve("@next/env", {
    paths: [dirname(require.resolve("next/package.json"))],
  }),
);
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
