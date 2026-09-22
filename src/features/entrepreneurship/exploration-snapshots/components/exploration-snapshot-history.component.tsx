import Link from "next/link";
import { Archive, ArrowLeft, ArrowUpRight } from "lucide-react";
import { z } from "zod";
import { getExplorationSnapshotHistory } from "@/features/entrepreneurship/exploration-snapshots/queries/exploration-snapshot.query";
import { explorationWorkspaceHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import {
  synthesisContextSchema,
  synthesisOutputSchema,
  synthesisSourceSchema,
  type SynthesisSource,
} from "@/features/entrepreneurship/synthesis/schemas/synthesis.schema";

const frozenSynthesisSchema = z.object({
  schemaVersion: z.literal(1),
  output: synthesisOutputSchema,
  context: synthesisContextSchema,
});

function sourcesFromManifest(value: unknown): SynthesisSource[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const sources = (value as { sources?: unknown }).sources;
  if (!Array.isArray(sources)) return [];
  return sources.flatMap((source) => {
    const result = synthesisSourceSchema.safeParse(source);
    return result.success ? [result.data] : [];
  });
}

export async function ExplorationSnapshotHistory({
  userId,
  nicheId,
}: {
  userId: string;
  nicheId: string;
}) {
  const editions = await getExplorationSnapshotHistory(userId, nicheId);
  return (
    <section className="exploration-history direct-workspace">
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">Historical truth</p>
          <h2>What you knew at the time.</h2>
          <p>
            Each edition preserves the accepted wording and frozen source
            excerpts.
          </p>
        </div>
        <Link
          className="business-text-link"
          href={explorationWorkspaceHref(nicheId, "so-far-we-know")}
        >
          <ArrowLeft aria-hidden="true" /> Current understanding
        </Link>
      </header>
      {editions.length > 0 ? (
        <ol className="exploration-history-list">
          {editions.map((edition) => {
            const synthesis = frozenSynthesisSchema.safeParse(
              edition.synthesis,
            );
            return (
              <li key={edition.id}>
                <header>
                  <div>
                    <span>Edition {edition.number}</span>
                    <h3>{businessDate(edition.publishedAt)}</h3>
                  </div>
                  <time dateTime={edition.publishedAt.toISOString()}>
                    Published {businessDate(edition.publishedAt)}
                  </time>
                </header>
                {synthesis.success ? (
                  <div className="exploration-history-edition">
                    <div className="exploration-history-summary">
                      <p className="eyebrow">Accepted synthesis</p>
                      <h3>{synthesis.data.output.title}</h3>
                      <p>{synthesis.data.output.summary}</p>
                    </div>
                    <div className="exploration-history-findings">
                      {synthesis.data.output.findings.map((finding, index) => (
                        <article
                          key={`${finding.claimId ?? "finding"}-${index}`}
                        >
                          <span>
                            {humanize(finding.lane)} · {humanize(finding.kind)}
                          </span>
                          <p>{finding.statement}</p>
                          <small>
                            {finding.sourceKeys.length} cited{" "}
                            {finding.sourceKeys.length === 1
                              ? "source"
                              : "sources"}
                          </small>
                        </article>
                      ))}
                    </div>
                    {synthesis.data.output.nextQuestions.length > 0 && (
                      <div className="exploration-history-unknowns">
                        <strong>Open questions</strong>
                        {synthesis.data.output.nextQuestions.map((question) => (
                          <p key={question}>{question}</p>
                        ))}
                      </div>
                    )}
                    <details className="exploration-history-sources">
                      <summary>
                        Captured source trail ·{" "}
                        {synthesis.data.context.sources.length}
                      </summary>
                      <div>
                        {synthesis.data.context.sources.map((source) => (
                          <Link key={source.key} href={source.href}>
                            <span>
                              <strong>{source.label}</strong>
                              <small>
                                {humanize(source.type)} ·{" "}
                                {businessDate(new Date(source.occurredAt))}
                              </small>
                              <p>{source.excerpt}</p>
                            </span>
                            <ArrowUpRight aria-hidden="true" />
                          </Link>
                        ))}
                      </div>
                    </details>
                    <details className="exploration-history-limitations">
                      <summary>Coverage and limitations</summary>
                      <p>
                        {synthesis.data.output.limitations ||
                          "No limitations were recorded."}
                      </p>
                      <p>
                        {synthesis.data.context.coverage.includedSources} of{" "}
                        {synthesis.data.context.coverage.eligibleSources}{" "}
                        eligible sources were captured in this edition.
                      </p>
                    </details>
                  </div>
                ) : (
                  <div className="exploration-history-edition">
                    <div className="exploration-history-findings">
                      {edition.claims.map((claim) => {
                        const manifest = sourcesFromManifest(
                          claim.claimRevision.sourceManifest,
                        );
                        return (
                          <article key={claim.claimId}>
                            <span>
                              {humanize(claim.claimRevision.lane)} ·{" "}
                              {humanize(claim.claimRevision.kind)}
                            </span>
                            <p>{claim.claimRevision.statement}</p>
                            {(claim.claimRevision.citations.length > 0 ||
                              manifest.length > 0) && (
                              <details>
                                <summary>
                                  Captured sources ·{" "}
                                  {claim.claimRevision.citations.length +
                                    manifest.length}
                                </summary>
                                <div className="exploration-history-manual-sources">
                                  {claim.claimRevision.citations.map(
                                    (citation) => (
                                      <div key={citation.id}>
                                        <strong>
                                          {humanize(citation.stance)}
                                        </strong>
                                        <p>
                                          {
                                            citation.observationRevision
                                              .statement
                                          }
                                        </p>
                                        {citation.observationRevision
                                          .sourceDescription && (
                                          <small>
                                            {
                                              citation.observationRevision
                                                .sourceDescription
                                            }
                                          </small>
                                        )}
                                      </div>
                                    ),
                                  )}
                                  {manifest.map((source) => (
                                    <Link key={source.key} href={source.href}>
                                      <strong>{source.label}</strong>
                                      <p>{source.excerpt}</p>
                                      <ArrowUpRight aria-hidden="true" />
                                    </Link>
                                  ))}
                                </div>
                              </details>
                            )}
                          </article>
                        );
                      })}
                    </div>
                    {edition.uncertainties.length > 0 && (
                      <div className="exploration-history-unknowns">
                        <strong>Open questions</strong>
                        {edition.uncertainties.map((item) => (
                          <p key={item.uncertaintyId}>
                            <span>
                              {humanize(item.uncertaintyRevision.kind)}
                            </span>
                            {item.uncertaintyRevision.statement}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="business-empty">
          <Archive aria-hidden="true" />
          <h3>No published edition yet.</h3>
          <p>
            Review the living record and publish when the understanding is
            useful enough to preserve.
          </p>
          <Link
            className="business-text-link"
            href={explorationWorkspaceHref(
              nicheId,
              "so-far-we-know",
              "/review",
            )}
          >
            Review the living record →
          </Link>
        </div>
      )}
    </section>
  );
}
