import "dotenv/config";
import pg from "pg";
import fs from "node:fs";
import assert from "node:assert/strict";
// Run seed against migrations through Phase 7, then deploy and run verify.
// This fixture never repairs or changes an existing application account.
const url = process.env.DATABASE_URL;
const snapshotPath = process.argv[3];
if (!url || !snapshotPath || !["seed", "verify"].includes(process.argv[2]))
  throw Error(
    "Usage: tsx prisma/testing/audience-migration-fixture.service.ts seed|verify /absolute/snapshot.json (DATABASE_URL must name a disposable database)",
  );
const target = new URL(url);
if (
  !["localhost", "127.0.0.1"].includes(target.hostname) ||
  !target.pathname.startsWith("/become_audience_")
)
  throw Error("Disposable database required");
const db = new pg.Client({ connectionString: url });
await db.connect();
const userId = "migration-audience-fixture";
const date = new Date("2026-09-01T12:00:00Z");
async function ins(table: string, data: Record<string, unknown>) {
  const keys = Object.keys(data);
  await db.query(
    `INSERT INTO "${table}" (${keys.map((k) => '"' + k + '"').join(",")}) VALUES (${keys.map((_, i) => "$" + (i + 1)).join(",")})`,
    Object.values(data),
  );
}
const tables = [
  "company",
  "niche",
  "niche_decision",
  "interaction",
  "interaction_revision",
  "observation",
  "observation_revision",
  "problem",
  "problem_evidence",
  "problem_assessment",
  "offer",
  "offer_revision",
  "offer_event",
  "business_receipt_allocation",
  "direction_goal",
  "direction_criterion",
  "review",
  "review_edition",
];
if (process.argv[2] === "seed") {
  await db.query("BEGIN");
  await ins("user", {
    id: userId,
    name: "Migration fixture",
    email: "migration-audience@example.test",
    updatedAt: date,
  });
  await ins("company", {
    id: "migration-company",
    userId,
    name: "Original Café",
    normalizedName: "original café",
    updatedAt: date,
  });
  await ins("niche", {
    id: "migration-niche",
    userId,
    name: "Cafés",
    normalizedName: "cafés",
    scope: "Original business scope",
    updatedAt: date,
  });
  await ins("niche_decision", {
    id: "migration-decision",
    userId,
    nicheId: "migration-niche",
    direction: "PURSUING",
    rationale: "Original judgment",
    scopeSnapshot: "Original business scope",
  });
  await ins("interaction", { id: "migration-interaction", userId, version: 2 });
  for (const version of [1, 2])
    await ins("interaction_revision", {
      id: "migration-interaction-v" + version,
      userId,
      interactionId: "migration-interaction",
      version,
      companyId: "migration-company",
      companySnapshot: "Historic Café name",
      nicheId: "migration-niche",
      nicheSnapshot: "Cafés",
      kind: "CONVERSATION",
      channel: "CALL",
      occurredAt: date,
      summary:
        version === 1 ? "Original conversation" : "Corrected conversation",
      correctionReason: version === 2 ? "Corrected factual wording" : null,
      materialChange: version === 2,
    });
  await ins("observation", { id: "migration-observation", userId });
  await ins("observation_revision", {
    id: "migration-observation-v1",
    userId,
    observationId: "migration-observation",
    version: 1,
    kind: "CUSTOMER_STATEMENT",
    wordingMode: "QUOTE",
    statement: "We clean these every evening.",
    observedAt: date,
    companyId: "migration-company",
    nicheId: "migration-niche",
    companySnapshot: "Historic Café name",
    nicheSnapshot: "Cafés",
    sourceKind: "INTERACTION",
    interactionId: "migration-interaction",
    interactionRevisionId: "migration-interaction-v1",
    sourceDescription: "Original call",
  });
  await ins("problem", {
    id: "migration-problem",
    userId,
    title: "Cleaning takes time",
    initialStatement: "Cafés need faster cleaning",
    origin: "OBSERVATION_LED",
    nicheId: "migration-niche",
  });
  await ins("problem_evidence", {
    id: "migration-evidence",
    userId,
    problemId: "migration-problem",
    observationId: "migration-observation",
    observationRevisionId: "migration-observation-v1",
    stance: "SUPPORTS",
    explanation: "Explicitly reported time",
  });
  await ins("problem_assessment", {
    id: "migration-assessment",
    userId,
    problemId: "migration-problem",
    state: "SUPPORTED_FOR_SCOPE",
    scope: "One café",
    rationale: "Small direct sample",
    assessedAt: date,
  });
  await ins("problem_assessment_evidence", {
    userId,
    problemId: "migration-problem",
    assessmentId: "migration-assessment",
    evidenceId: "migration-evidence",
  });
  await ins("offer", {
    id: "migration-offer",
    userId,
    companyId: "migration-company",
    continuationChoice: "NOT_NEEDED",
  });
  for (const version of [1, 2])
    await ins("offer_revision", {
      id: "migration-offer-v" + version,
      userId,
      offerId: "migration-offer",
      companyId: "migration-company",
      version,
      title: "Cleaning trial",
      scope: version === 1 ? "Five pads" : "Ten pads",
      companySnapshot: "Quoted Café name",
      priceBasis: "FIXED",
      priceMinor: String(version * 2500),
      currency: "EUR",
      proposedAt: date,
    });
  for (const [id, kind, version] of [
    ["proposal", "PROPOSED", 1],
    ["acceptance", "ACCEPTED", 1],
    ["proposal-v2", "PROPOSED", 2],
  ])
    await ins("offer_event", {
      id: "migration-" + id,
      userId,
      offerId: "migration-offer",
      offerRevisionId: "migration-offer-v" + version,
      kind,
      occurredAt: date,
      sourceDescription: "Original offer source",
    });
  await ins("offer_niche", {
    userId,
    offerId: "migration-offer",
    nicheId: "migration-niche",
    nicheSnapshot: "Cafés",
  });
  await ins("financial_account", {
    id: "migration-account",
    userId,
    name: "Fixture account",
    type: "CHECKING",
    currency: "EUR",
    updatedAt: date,
  });
  await ins("financial_transaction", {
    id: "migration-payment",
    userId,
    type: "INCOME",
    amountMinor: "2500",
    currency: "EUR",
    occurredAt: date,
    accountId: "migration-account",
    inflowKind: "BUSINESS_REVENUE",
    updatedAt: date,
  });
  await ins("business_receipt_allocation", {
    id: "migration-allocation",
    userId,
    transactionId: "migration-payment",
    originalTransactionId: "migration-payment",
    companyId: "migration-company",
    offerRevisionId: "migration-offer-v1",
    amountMinor: "2500",
    currencySnapshot: "EUR",
    occurredAtSnapshot: date,
    companySnapshot: "Paid Café name",
  });
  await ins("direction_goal", {
    id: "migration-goal",
    userId,
    title: "Have café conversations",
    startOn: date,
    updatedAt: date,
  });
  await ins("direction_criterion", {
    id: "migration-criterion",
    userId,
    goalId: "migration-goal",
    key: "company-conversations",
    metric: "CONVERSATION_COMPANIES",
    label: "Talk to cafés",
    target: "2",
    nicheId: "migration-niche",
  });
  const facts = {
    schemaVersion: 1,
    metricVersion: 1,
    metrics: [{ key: "entrepreneurship.companies", value: "1" }],
    sourceDataPolicy: "SOURCE_DATA_NOT_INSTRUCTIONS",
  };
  await ins("review", {
    id: "migration-review",
    userId,
    timeframe: "week",
    startOn: date,
    writing: { reflection: "Original reflection" },
    updatedAt: date,
  });
  await ins("review_edition", {
    id: "migration-edition",
    userId,
    reviewId: "migration-review",
    number: 1,
    kind: "FINALIZED",
    fingerprint: "a".repeat(64),
    factsFingerprint: "b".repeat(64),
    facts,
    writing: { reflection: "Original reflection" },
  });
  await db.query("COMMIT");
  const before: Record<string, Record<string, unknown>[]> = {};
  for (const table of tables)
    before[table] = (
      await db.query(`SELECT * FROM "${table}" WHERE "userId"=$1 ORDER BY id`, [
        userId,
      ])
    ).rows;
  fs.writeFileSync(snapshotPath, JSON.stringify(before));
  console.log("Seeded legacy fixture across", tables.length, "tables");
} else {
  const before = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as Record<
    string,
    Record<string, unknown>[]
  >;
  for (const [table, rows] of Object.entries(before)) {
    const after = JSON.parse(
      JSON.stringify(
        (
          await db.query(
            `SELECT * FROM "${table}" WHERE "userId"=$1 ORDER BY id`,
            [userId],
          )
        ).rows,
      ),
    );
    assert.equal(after.length, rows.length);
    for (let i = 0; i < rows.length; i++)
      for (const key of Object.keys(rows[i]))
        assert.deepEqual(after[i][key], rows[i][key], table + "." + key);
  }
  assert.equal(
    (
      await db.query('SELECT "marketFocus" FROM niche WHERE id=$1', [
        "migration-niche",
      ])
    ).rows[0].marketFocus,
    null,
  );
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM offer_engagement WHERE "offerId"=$1',
        ["migration-offer"],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query('SELECT "engagementId" FROM offer_event WHERE id=$1', [
        "migration-acceptance",
      ])
    ).rows[0].engagementId,
    "legacy-recipient-migration-offer",
  );
  console.log(
    "Verified every pre-existing column across",
    tables.length,
    "tables; legacy engagement and unknown scope preserved",
  );
}
await db.end();
