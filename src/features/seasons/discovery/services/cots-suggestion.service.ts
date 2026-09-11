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
const cache = new Map<
  string,
  { expires: number; value: Awaited<ReturnType<typeof requestSuggestions>> }
>();
async function requestSuggestions(displayName: string, sourceWork: string) {
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
  return { items, status: "AVAILABLE" };
}
export async function suggestCotsIdentity(input: unknown) {
  if (!cotsProviderEnabled("wikidata"))
    return { items: [], status: "SETUP_REQUIRED" };
  const c = z
    .object({
      displayName: z.string().trim().min(1).max(200),
      sourceWork: z.string().trim().max(200).default(""),
      sourceCategory: cotsCategorySchema,
    })
    .parse(input);
  const key = JSON.stringify(c),
    prior = cache.get(key);
  if (prior && prior.expires > Date.now()) return prior.value;
  try {
    const value = await requestSuggestions(c.displayName, c.sourceWork);
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, expires: Date.now() + 3_600_000 });
    return value;
  } catch (error) {
    if (error instanceof CotsProviderError)
      return { items: [], status: error.status };
    throw error;
  }
}
