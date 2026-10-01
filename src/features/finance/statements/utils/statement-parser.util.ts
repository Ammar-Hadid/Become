import { DateTime } from "luxon";
import { parseMoney } from "@/lib/money/utils/money.util";
import { evidenceHash } from "@/features/finance/evidence/utils/financial-evidence.util";
export type StatementColumnMapping = {
  date?: string;
  amount?: string;
  description?: string;
  counterparty?: string;
  reference?: string;
  direction?: string;
  currency?: string;
  positiveDirection?: "DEBIT" | "CREDIT";
};
export type StatementRow = {
  line: number;
  activityDate: string;
  amountMinor: bigint;
  currency: string;
  direction: "DEBIT" | "CREDIT";
  description: string;
  counterpartyName: string | null;
  reference: string | null;
  raw: Record<string, string>;
};
export type StatementParseResult = {
  rows: StatementRow[];
  errors: { line: number; message: string }[];
  headers: string[];
};
const normalize = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export function readDelimitedRows(text: string): string[][] {
  const first = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0];
  const delimiter = [";", ",", "\t"].sort(
    (a, b) => first.split(b).length - first.split(a).length,
  )[0];
  const result: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((x) => x.trim())) result.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("A quoted field is not closed.");
  row.push(field);
  if (row.some((x) => x.trim())) result.push(row);
  return result;
}
function parseDay(value: string): string {
  for (const format of [
    "yyyy-MM-dd",
    "dd-MM-yyyy",
    "dd/MM/yyyy",
    "dd.MM.yyyy",
    "yyyyMMdd",
  ]) {
    const d = DateTime.fromFormat(value.trim(), format, { zone: "UTC" });
    if (d.isValid) return d.toISODate()!;
  }
  throw new Error("Use an unambiguous date including the year.");
}
function parseAmount(input: string, currency: string): bigint {
  let value = input
    .trim()
    .replace(/[€$£\s]/g, "")
    .replace(new RegExp(currency, "gi"), "");
  if (/^\(.*\)$/.test(value)) value = "-" + value.slice(1, -1);
  if (value.includes(",") && value.includes("."))
    value =
      value.lastIndexOf(",") > value.lastIndexOf(".")
        ? value.replace(/\./g, "").replace(",", ".")
        : value.replace(/,/g, "");
  else if (value.includes(",")) value = value.replace(",", ".");
  return parseMoney(value, currency);
}
export function parseStatementCsv(
  text: string,
  currency: string,
  mapping: StatementColumnMapping = {},
): StatementParseResult {
  const matrix = readDelimitedRows(text);
  const headers = (matrix.shift() ?? []).map((x) =>
    x.replace(/^\uFEFF/, "").trim(),
  );
  const errors: StatementParseResult["errors"] = [];
  const rows: StatementRow[] = [];
  if (matrix.length > 5000)
    return {
      rows,
      headers,
      errors: [
        { line: 0, message: "Import at most 5,000 statement rows at once." },
      ],
    };
  const column = (selected: string | undefined, names: string[]) =>
    selected
      ? headers.indexOf(selected)
      : headers.findIndex((h) => names.includes(normalize(h)));
  const indexes = {
    date: column(mapping.date, [
      "date",
      "datum",
      "bookingdate",
      "boekdatum",
      "transactiedatum",
    ]),
    amount: column(mapping.amount, [
      "amount",
      "bedrag",
      "bedrageur",
      "amount eur",
      "transactiebedrag",
    ]),
    description: column(mapping.description, [
      "description",
      "omschrijving",
      "naamomschrijving",
      "mededelingen",
    ]),
    counterparty: column(mapping.counterparty, [
      "counterparty",
      "naam",
      "merchant",
      "begunstigde",
    ]),
    reference: column(mapping.reference, [
      "reference",
      "referentie",
      "transactionid",
      "transactieid",
    ]),
    direction: column(mapping.direction, [
      "direction",
      "afbij",
      "debitcredit",
      "type",
    ]),
    currency: column(mapping.currency, ["currency", "valuta", "munt"]),
  };
  if (indexes.date < 0 || indexes.amount < 0)
    return {
      rows,
      headers,
      errors: [
        {
          line: 1,
          message: "Map a date column and an amount column before importing.",
        },
      ],
    };
  matrix.forEach((fields, index) => {
    const line = index + 2;
    try {
      if (fields.length !== headers.length)
        throw new Error("The number of columns differs from the header.");
      const value = (key: keyof typeof indexes) =>
        indexes[key] < 0 ? "" : fields[indexes[key]].trim();
      const rowCurrency = (value("currency") || currency).toUpperCase();
      if (rowCurrency !== currency)
        throw new Error("This row uses a different account currency.");
      const signed = parseAmount(value("amount"), currency);
      if (signed === 0n)
        throw new Error("A transaction amount must be nonzero.");
      const marker = normalize(value("direction"));
      const debit = [
        "af",
        "debit",
        "debet",
        "d",
        "expense",
        "uitgave",
      ].includes(marker);
      const credit = ["bij", "credit", "c", "income", "inkomst"].includes(
        marker,
      );
      if (marker && !debit && !credit)
        throw new Error("Unrecognized debit/credit value.");
      const direction = debit
        ? "DEBIT"
        : credit
          ? "CREDIT"
          : signed < 0n
            ? "DEBIT"
            : (mapping.positiveDirection ?? "CREDIT");
      rows.push({
        line,
        activityDate: parseDay(value("date")),
        amountMinor: signed < 0n ? -signed : signed,
        currency,
        direction,
        description: value("description"),
        counterpartyName: value("counterparty") || null,
        reference: value("reference") || null,
        raw: Object.fromEntries(headers.map((h, i) => [h, fields[i]])),
      });
    } catch (error) {
      errors.push({
        line,
        message:
          error instanceof Error ? error.message : "Could not read this row.",
      });
    }
  });
  return { rows, errors, headers };
}
export function parseStatementPdfText(
  text: string,
  currency: string,
  positiveDirection: "DEBIT" | "CREDIT" = "DEBIT",
): StatementParseResult {
  const rows: StatementRow[] = [];
  const errors: StatementParseResult["errors"] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const date = line.match(
      /^\s*(\d{4}-\d{2}-\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4})\s+(.+)$/,
    );
    if (!date) return;
    const match = date[2].match(
      /^(.*?)\s+([+-]?(?:\d{1,3}(?:[.,]\d{3})+|\d+)[.,]\d{2})\s*(?:EUR|€)?\s*(Af|Bij|Debit|Credit)?\s*$/i,
    );
    if (!match) {
      errors.push({
        line: index + 1,
        message:
          "This dated PDF row has an unsupported amount layout. Use CSV mapping or a supported text PDF.",
      });
      return;
    }
    try {
      const signed = parseAmount(match[2], currency);
      if (signed === 0n)
        throw new Error("A transaction amount must be nonzero.");
      const marker = match[3]?.toLowerCase();
      rows.push({
        line: index + 1,
        activityDate: parseDay(date[1]),
        amountMinor: signed < 0n ? -signed : signed,
        currency,
        direction:
          marker === "af" || marker === "debit"
            ? "DEBIT"
            : marker === "bij" || marker === "credit"
              ? "CREDIT"
              : signed < 0n
                ? "DEBIT"
                : positiveDirection,
        description: match[1].trim(),
        counterpartyName: match[1].trim() || null,
        reference: null,
        raw: { text: line },
      });
    } catch (error) {
      errors.push({
        line: index + 1,
        message:
          error instanceof Error ? error.message : "Could not read this row.",
      });
    }
  });
  if (!rows.length && !errors.length)
    errors.push({
      line: 0,
      message:
        "No supported text transaction rows found. Scanned PDFs are unsupported; use a CSV export or a verified text statement layout.",
    });
  return { rows, errors, headers: [] };
}
export function statementFileHash(data: Uint8Array) {
  return evidenceHash(Array.from(data));
}
