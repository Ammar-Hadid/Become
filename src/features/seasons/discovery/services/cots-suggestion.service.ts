import { z } from "zod";
import { cotsProviderEnabled } from "@/features/seasons/discovery/config/cots-provider.config";
import {
  array,
  record,
  string,
  providerJson,
  CotsProviderError,
} from "@/features/seasons/discovery/services/cots-provider-http.service";
import { cotsCategorySchema } from "@/features/seasons/discovery/schemas/cots-discovery.schema";

type SuggestionResult = Awaited<ReturnType<typeof requestSuggestions>>;

const cache = new Map<string, { expires: number; value: SuggestionResult }>();
const inFlight = new Map<string, Promise<SuggestionResult>>();

function logSuggestionSourceIssue(
  status: string,
  detail: string,
  sourceCategory: string,
) {
  const diagnostic = {
    event: "cots.identity_suggestion.source_issue",
    provider: "wikidata",
    status,
    detail,
    sourceCategory,
  };
  if (status === "EXHAUSTED")
    console.info(
      "COTS identity suggestion source returned no matches",
      diagnostic,
    );
  else console.warn("COTS identity suggestion source failed", diagnostic);
}

function suggestionKey(displayName: string) {
  return displayName.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

async function requestSuggestions(displayName: string) {
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.search = new URLSearchParams({
    action: "wbsearchentities",
    format: "json",
    search: displayName,
    language: "en",
    limit: "5",
    type: "item",
  }).toString();
  const response = record(await providerJson("wikimedia", url));
  const rows = array(response.search).map(record);
  const ids = rows.map((v) => string(v.id)).filter((id) => /^Q\d+$/.test(id));
  if (!ids.length) return { items: [], status: "EXHAUSTED" };
  url.search = new URLSearchParams({
    action: "wbgetentities",
    format: "json",
    ids: ids.join("|"),
    props: "claims",
  }).toString();
  const entities = record(
    record(await providerJson("wikimedia", url)).entities,
  );
  const items = rows.map((row) => {
    const claims = array(record(record(entities[string(row.id)]).claims).P31);
    const human = claims.some(
      (v) =>
        string(
          record(record(record(record(v).mainsnak).datavalue).value).id,
        ) === "Q5",
    );
    return {
      id: string(row.id),
      label: string(row.label),
      description: string(row.description),
      subjectKind: human ? ("PERSON" as const) : ("UNKNOWN" as const),
    };
  });
  return { items, status: "AVAILABLE" };
}

function rankSuggestions(value: SuggestionResult, sourceWork: string) {
  if (!sourceWork || value.items.length < 2) return value;
  const items = [...value.items];
  items.sort(
    (a, b) =>
      Number(
        Boolean(
          sourceWork &&
          b.description.toLowerCase().includes(sourceWork.toLowerCase()),
        ),
      ) -
      Number(
        Boolean(
          sourceWork &&
          a.description.toLowerCase().includes(sourceWork.toLowerCase()),
        ),
      ),
  );
  return { ...value, items };
}

async function cachedSuggestions(displayName: string) {
  const key = suggestionKey(displayName);
  const prior = cache.get(key);
  if (prior && prior.expires > Date.now()) return prior.value;
  let request = inFlight.get(key);
  if (!request) {
    request = requestSuggestions(displayName);
    inFlight.set(key, request);
  }
  try {
    const value = await request;
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, {
      value,
      expires:
        Date.now() + (value.status === "AVAILABLE" ? 3_600_000 : 5 * 60_000),
    });
    return value;
  } finally {
    if (inFlight.get(key) === request) inFlight.delete(key);
  }
}

export async function suggestCotsIdentity(input: unknown) {
  const c = z
    .object({
      displayName: z.string().trim().min(1).max(200),
      sourceWork: z.string().trim().max(200).default(""),
      sourceCategory: cotsCategorySchema,
    })
    .parse(input);
  if (!cotsProviderEnabled("wikidata")) {
    logSuggestionSourceIssue(
      "SETUP_REQUIRED",
      "Wikidata is disabled in the provider configuration.",
      c.sourceCategory,
    );
    return { items: [], status: "SETUP_REQUIRED" };
  }
  try {
    const result = rankSuggestions(
      await cachedSuggestions(c.displayName),
      c.sourceWork,
    );
    if (result.status !== "AVAILABLE")
      logSuggestionSourceIssue(
        result.status,
        "No matching Wikidata entities were returned.",
        c.sourceCategory,
      );
    return result;
  } catch (error) {
    if (error instanceof CotsProviderError) {
      logSuggestionSourceIssue(error.status, error.message, c.sourceCategory);
      return { items: [], status: error.status };
    }
    throw error;
  }
}
