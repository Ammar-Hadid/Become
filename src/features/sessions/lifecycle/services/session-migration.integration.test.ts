import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readdir,
  copyFile,
  writeFile,
  rm,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

describe.skipIf(process.env.RUN_SESSION_MIGRATION_INTEGRATION !== "1")(
  "pause migration safety",
  () => {
    it("preserves legacy sessions and the unfinished-session constraint", async () => {
      const url = new URL(process.env.DATABASE_URL!);
      if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
        throw Error("Local PostgreSQL required");
      const root = process.cwd();
      const name = "become_pause_migration_" + randomUUID().replaceAll("-", "");
      const admin = new Client({ connectionString: url.toString() });
      await admin.connect();
      await admin.query(`CREATE DATABASE "${name}"`);
      url.pathname = "/" + name;
      const db = new Client({ connectionString: url.toString() });
      const dir = await mkdtemp("/private/tmp/become-pause-migration-");
      try {
        const migrations = dir + "/migrations";
        await mkdir(migrations);
        await writeFile(
          migrations + "/migration_lock.toml",
          'provider = "postgresql"\n',
        );
        await writeFile(
          dir + "/prisma.config.ts",
          `export default {schema:${JSON.stringify(root + "/prisma/schema.prisma")},migrations:{path:${JSON.stringify(migrations)}},datasource:{url:process.env.PAUSE_TEST_DATABASE_URL}};\n`,
        );
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
        const deploy = () => {
          const result = spawnSync(
            process.execPath,
            [
              root + "/node_modules/prisma/build/index.js",
              "migrate",
              "deploy",
              "--config",
              dir + "/prisma.config.ts",
            ],
            {
              cwd: root,
              env: { ...process.env, PAUSE_TEST_DATABASE_URL: url.toString() },
              encoding: "utf8",
            },
          );
          if (result.status !== 0) throw Error(result.stdout + result.stderr);
        };
        for (const entry of entries.filter(
          (e) => e < "20260913000000_session_pauses",
        ))
          await copy(entry);
        deploy();
        await db.connect();
        await db.query(`INSERT INTO "user" (id,name,email,"updatedAt") VALUES ('owner','Migration','pause-migration@example.test',NOW());
        INSERT INTO domain (id,"userId",name,slug,icon,"updatedAt") VALUES ('d','owner','Custom','custom','circle',NOW());
        INSERT INTO activity_type (id,"domainId",name,slug,"updatedAt") VALUES ('a','d','Focus','focus',NOW());
        INSERT INTO session (id,"userId","domainId","activityTypeId","startedAt","endedAt",description,"updatedAt") VALUES
        ('saved','owner','d','a','2026-09-01 10:00','2026-09-01 11:00','Historical',NOW()),
        ('running','owner','d','a','2026-09-01 12:00',NULL,'Still here',NOW());`);
        const before = (await db.query("SELECT * FROM session ORDER BY id"))
          .rows;
        await copy("20260913000000_session_pauses");
        deploy();
        expect(
          (await db.query("SELECT * FROM session ORDER BY id")).rows,
        ).toEqual(before);
        expect(
          (await db.query('SELECT "timerRevision" FROM "user"')).rows[0]
            .timerRevision,
        ).toBe(0);
        await db.query(
          `INSERT INTO session_pause (id,"sessionId","startedAt") VALUES ('pause','running','2026-09-01 12:30')`,
        );
        await expect(
          db.query(
            `INSERT INTO session (id,"userId","domainId","activityTypeId","startedAt","updatedAt") VALUES ('blocked','owner','d','a',NOW(),NOW())`,
          ),
        ).rejects.toMatchObject({ code: "23505" });
        await expect(
          db.query(
            `INSERT INTO session_pause (id,"sessionId","startedAt") VALUES ('duplicate','running',NOW())`,
          ),
        ).rejects.toMatchObject({ code: "23505" });
        await expect(
          db.query(
            `UPDATE session_pause SET "endedAt"='2026-09-01 12:00' WHERE id='pause'`,
          ),
        ).rejects.toMatchObject({ code: "23514" });
      } finally {
        await db.end();
        await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
        await admin.end();
        await rm(dir, { recursive: true, force: true });
      }
    }, 60000);
  },
);
