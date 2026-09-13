import {
  boundedExcerpt,
  measurePacket,
} from "@/features/reviews/facts/utils/review-payload.util";
import type { DirectionTx } from "@/features/direction/services/direction-mutation.service";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import { seasonCharacter } from "@/features/seasons/mappers/season-character.mapper";
import type { PersonaInput } from "@/features/seasons/persona/schemas/persona.schema";
import { reviewFingerprint } from "@/features/reviews/facts/utils/review-fingerprint.util";

export async function readPersonaInput(
  tx: DirectionTx,
  userId: string,
  seasonId: string | null,
): Promise<PersonaInput> {
  const season = seasonId
    ? await tx.userSeason.findFirst({
        where: { id: seasonId, userId },
        select: { character: true, answers: true },
      })
    : null;
  const character = seasonCharacter(season?.character);
  const identity = seasonId
    ? await getCotsIdentity(userId, seasonId, tx)
    : null;
  const where = {
    userId,
    seasonId: seasonId ?? "",
    identityId: identity?.row.id ?? null,
    retiredAt: null,
  };
  const [quotes, count] = await Promise.all([
    tx.seasonQuote.findMany({
      where,
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }, { id: "asc" }],
      take: 8,
    }),
    tx.seasonQuote.count({ where }),
  ]);
  const context = {
    category: identity?.view.sourceCategory ?? character.sourceCategory ?? null,
    work: identity?.view.sourceWork ?? character.sourceWork,
    adaptation: identity?.view.adaptation ?? character.adaptation,
  };
  const warnings: string[] = [];
  const clip = (s: string, n: number) => {
    if (Buffer.byteLength(s, "utf8") > n && !warnings.length)
      warnings.push(
        "Long user text is excerpted; retrieve its owned Season source for full wording.",
      );
    return boundedExcerpt(s, n);
  };
  const name = identity?.view.displayName ?? character.name;
  const input: PersonaInput = {
    schemaVersion: 1,
    fingerprint: "",
    sourceFingerprint: reviewFingerprint({
      character,
      answers: season?.answers,
      quotes,
    }),
    identity: name
      ? {
          fingerprint: reviewFingerprint({
            name,
            context,
            id: identity?.row.id,
            revision: identity?.view.identityRevision,
          }),
          id: identity?.row.id ?? null,
          revision: identity?.view.identityRevision ?? 0,
          name,
          ...context,
          contextFingerprint: reviewFingerprint(context),
        }
      : null,
    groundedProfile: null,
    profileStatus: name ? "AWAITING_PHASE_8_PROFILE" : "NO_COTS",
    constraints: {
      admiredTraits: clip(character.motivation, 1000),
      rejectedTraits: clip(character.avoid, 1000),
      standards: character.standards
        .slice(0, 12)
        .map((s) => ({
          trait: clip(s.trait, 160),
          behavior: clip(s.behavior, 300),
          ...(s.goalId ? { goalId: s.goalId } : {}),
          ...(s.criterionId ? { criterionId: s.criterionId } : {}),
        })),
      seasonAnswers: Object.fromEntries(
        Object.entries((season?.answers as Record<string, unknown>) ?? {})
          .filter(([key]) =>
            ["carryForward", "leaveBehind", "protect", "meaningful"].includes(
              key,
            ),
          )
          .filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          )
          .map(([k, v]) => [k, clip(v, 600)]),
      ),
    },
    approvedSources: quotes.map((q) => {
      const p = q.provenance as Record<string, unknown>;
      return {
        id: q.id,
        kind: "CURATED_QUOTE",
        title: clip(String(p.sourceTitle ?? "Saved quotation"), 500),
        url: typeof p.sourceUrl === "string" ? p.sourceUrl : null,
        attribution: clip(q.attribution, 500),
        attributionStatus:
          q.kind === "PARAPHRASE"
            ? "PARAPHRASE"
            : p.attributionVerified === true && q.kind === "EXACT"
              ? "VERIFIED"
              : q.kind === "EXACT"
                ? "UNVERIFIED"
                : "UNKNOWN",
        excerpt: clip(q.text, 800),
        instructionStatus: "SOURCE_DATA",
      };
    }),
    omittedSourceCount: Math.max(0, count - quotes.length),
    interpretation: "GROUNDED_PROFILE_CONSTRAINED_BY_USER_CHOICES",
    factualBoundary:
      "PERSONALITY_NEVER_CHANGES_FACTS_QUALIFICATION_UNCERTAINTY_OR_SAFETY",
    warnings,
    payloadBytes: 0,
  };
  input.fingerprint = reviewFingerprint({
    ...input,
    fingerprint: undefined,
    payloadBytes: undefined,
  });
  measurePacket(input);
  while (input.payloadBytes > 24 * 1024 && input.approvedSources.length) {
    input.approvedSources.pop();
    input.omittedSourceCount++;
    input.fingerprint = reviewFingerprint({
      ...input,
      fingerprint: undefined,
      payloadBytes: undefined,
    });
    measurePacket(input);
  }
  if (input.payloadBytes > 24 * 1024)
    throw Error("Persona input exceeds its bounded payload budget");
  return input;
}
