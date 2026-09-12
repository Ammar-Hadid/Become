import { createRequire } from "node:module";
import {
  readFile,
  readdir,
  mkdtemp,
  mkdir,
  copyFile,
  writeFile,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { describe, it } from "vitest";

const suite =
  process.env.RUN_CONTENT_MIGRATION_INTEGRATION === "1"
    ? describe
    : describe.skip;
suite("Phase 6 additive migration safety", () => {
  it("rolls back collisions and preserves legacy domain/activity/session identity", async () => {
    const root = process.cwd();
    const require = createRequire(root + "/package.json");
    const { Client } = require("pg");
    const env = require("dotenv").parse(await readFile(root + "/.env"));
    const url = new URL(env.DATABASE_URL);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      !url.pathname.startsWith("/become_phase6_")
    )
      throw Error("Disposable local source only");
    const name = "become_phase6_migration_" + randomUUID().replaceAll("-", "");
    const admin = new Client({ connectionString: url.toString() });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${name}"`);
    console.log("Created migration-check database: " + name);
    url.pathname = "/" + name;
    const db = new Client({ connectionString: url.toString() });
    try {
      const dir = await mkdtemp("/private/tmp/become-phase6-migrations-");
      const migrations = dir + "/migrations";
      await mkdir(migrations);
      const source = root + "/prisma/migrations";
      const entries = (await readdir(source, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
      const copy = async (entry: string) => {
        await mkdir(migrations + "/" + entry);
        await copyFile(
          source + "/" + entry + "/migration.sql",
          migrations + "/" + entry + "/migration.sql",
        );
      };
      await writeFile(
        migrations + "/migration_lock.toml",
        'provider = "postgresql"\n',
      );
      await writeFile(
        dir + "/prisma.config.ts",
        `export default { schema: ${JSON.stringify(root + "/prisma/schema.prisma")}, migrations:{path:${JSON.stringify(migrations)}}, datasource:{url:process.env.PHASE6_MIGRATION_DATABASE_URL} };\n`,
      );
      function migrate(args: string[], expectedFailure = false) {
        const result = spawnSync(
          root + "/node_modules/.bin/prisma",
          ["migrate", ...args, "--config", dir + "/prisma.config.ts"],
          {
            cwd: root,
            env: {
              ...process.env,
              PHASE6_MIGRATION_DATABASE_URL: url.toString(),
            },
            encoding: "utf8",
          },
        );
        if ((result.status === 0) === expectedFailure) {
          console.error(result.stdout, result.stderr);
          throw Error("Unexpected migration command result");
        }
        return result.stdout + "\n" + result.stderr;
      }
      for (const entry of entries.filter(
        (e) => e < "20260912000000_phase6_content_thinking",
      ))
        await copy(entry);
      migrate(["deploy"]);
      await db.connect();
      // Structural migration fixtures have no login/password/auth account.
      await db.query(
        `INSERT INTO "user" (id,name,email,"updatedAt") VALUES ('migration-owner','Migration fixture','phase6-migration@example.com',now())`,
      );
      await db.query(
        `INSERT INTO domain (id,"userId",name,slug,icon,"updatedAt") VALUES ('legacy-domain','migration-owner','YouTube','youtube','play',now()),('collision-domain','migration-owner','Custom content','content','play',now())`,
      );
      await db.query(
        `INSERT INTO activity_type (id,"domainId",name,slug,"updatedAt") VALUES ('legacy-activity','legacy-domain','Scripting','scripting',now())`,
      );
      await db.query(
        `INSERT INTO session (id,"userId","domainId","activityTypeId","startedAt","endedAt",description,"updatedAt") VALUES ('legacy-session','migration-owner','legacy-domain','legacy-activity','2026-03-28T10:00:00Z','2026-03-28T11:00:00Z','Legacy unclassified creative effort',now())`,
      );
      for (const entry of entries.filter((e) => e.startsWith("20260912")))
        await copy(entry);
      const failure = migrate(["deploy"], true);
      if (!failure.includes("Phase 6 domain collision"))
        throw Error("Expected collision guard");
      const residual = (
        await db.query(`SELECT to_regclass('public.content') AS content`)
      ).rows[0];
      if (residual.content !== null)
        throw Error("Migration left partial schema after failed precondition");
      console.log(
        "PASS: Prisma deploy rejects a domain collision and rolls back all Phase 6 schema changes.",
      );
      await db.query(
        `DELETE FROM domain WHERE id='collision-domain' AND "userId"='migration-owner'`,
      );
      migrate([
        "resolve",
        "--rolled-back",
        "20260912000000_phase6_content_thinking",
      ]);
      migrate(["deploy"]);
      const records = (
        await db.query(
          `SELECT d.id,d.slug,d.name,a.id AS activity,s.id AS session,s."contentId",s."contentVariantId",s.description FROM domain d JOIN activity_type a ON a."domainId"=d.id JOIN session s ON s."activityTypeId"=a.id WHERE d.id='legacy-domain'`,
        )
      ).rows;
      if (
        records.length !== 1 ||
        records[0].slug !== "content" ||
        records[0].name !== "Content" ||
        records[0].activity !== "legacy-activity" ||
        records[0].session !== "legacy-session" ||
        records[0].contentId !== null ||
        records[0].contentVariantId !== null
      )
        throw Error("Legacy identity/attribution changed");
      if (
        Number(
          (await db.query("SELECT COUNT(*) FROM content")).rows[0].count,
        ) !== 0
      )
        throw Error("Inferred creative work from legacy sessions");
      console.log(
        "PASS: all migrations apply; domain/activity/session IDs and text survive, legacy attribution stays null, no creative work is inferred.",
      );
      console.log("Fixture database: " + name);
    } finally {
      await db.end().catch(() => {});
      await admin.query(`DROP DATABASE "${name}"`);
      await admin.end();
      console.log(
        "Removed only the migration-check database created by this script.",
      );
    }
  }, 120000);
});
