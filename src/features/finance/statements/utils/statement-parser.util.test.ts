import { expect, it } from "vitest";
import {
  parseStatementCsv,
  parseStatementPdfText,
} from "./statement-parser.util";
it("reads Dutch CSV quoting, exact decimals and explicit debit markers", () => {
  const r = parseStatementCsv(
    'Datum;Bedrag;Naam;Af Bij\n30-09-2026;"1.234,56";"Shop; One";Af\n01-10-2026;12,95;Refund;Bij',
    "EUR",
  );
  expect(r.errors).toEqual([]);
  expect(r.rows[0]).toMatchObject({
    amountMinor: 123456n,
    direction: "DEBIT",
    counterpartyName: "Shop; One",
  });
  expect(r.rows[1].direction).toBe("CREDIT");
});
it("retains indistinguishable purchases and rejects partial malformed input", () => {
  const r = parseStatementCsv(
    "Date,Amount,Description\n2026-10-01,-12.95,Cafe\n2026-10-01,-12.95,Cafe\n2026-02-30,-4,Broken",
    "EUR",
  );
  expect(r.rows).toHaveLength(2);
  expect(r.errors).toHaveLength(1);
});
it("never guesses a scanned PDF or ambiguous statement row", () => {
  expect(
    parseStatementPdfText("2026-10-01 Cafe 12,95 Af", "EUR").rows[0]
      .amountMinor,
  ).toBe(1295n);
  expect(parseStatementPdfText("Image only", "EUR").errors).toHaveLength(1);
  expect(
    parseStatementPdfText("2026-10-01 Cafe unknown", "EUR").errors,
  ).toHaveLength(1);
});
