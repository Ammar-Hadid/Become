import Link from "next/link";
import { ArrowRight, BookOpenText, Building2, UserRound } from "lucide-react";
import { getInterviewGuideIndex } from "@/features/entrepreneurship/interview-guides/queries/interview-guide.query";
import { getAudienceOptions } from "@/features/entrepreneurship/audiences/queries/audience.query";
import { LearnNavigation } from "@/features/entrepreneurship/learn/components/learn-navigation.component";
import {
  InterviewGuideCreateForm,
  EnsureStarterGuides,
} from "@/features/entrepreneurship/interview-guides/components/interview-guide-forms.component";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { businessDate } from "@/features/entrepreneurship/shared/utils/business.util";

export async function InterviewGuideIndex({
  userId,
  nicheId,
}: {
  userId: string;
  nicheId: string;
}) {
  const [guides, options] = await Promise.all([
    getInterviewGuideIndex(userId, nicheId),
    getAudienceOptions(userId, nicheId),
  ]);
  const active = guides.filter((guide) => !guide.archivedAt);
  const starter = (market: "B2C" | "B2B") =>
    active.find((guide) => guide.marketType === market);
  return (
    <div className="exploration-stage">
      <header className="exploration-stage-heading">
        <div>
          <h2>Prepare questions without scripting the person.</h2>
          <p>
            A published revision stays pinned to the interview that used it.
            Later edits never rewrite an earlier exchange.
          </p>
        </div>
        <div className="business-actions">
          <InterviewGuideCreateForm
            nicheId={nicheId}
            segments={options.segments}
          />
          {(!starter("B2C") || !starter("B2B")) && (
            <EnsureStarterGuides nicheId={nicheId} />
          )}
        </div>
      </header>
      <LearnNavigation nicheId={nicheId} active="guides" />
      <section
        className="interview-guide-starters"
        aria-labelledby="starter-guides-title"
      >
        <header>
          <p className="eyebrow">Starting points</p>
          <h3 id="starter-guides-title">Consumer and business discovery</h3>
        </header>
        <div>
          {(["B2C", "B2B"] as const).map((market) => {
            const guide = starter(market);
            const Icon = market === "B2C" ? UserRound : Building2;
            return guide ? (
              <Link
                key={market}
                href={explorationHref(
                  nicheId,
                  `/learn/guides/${guide.id}/edit`,
                )}
              >
                <Icon aria-hidden="true" />
                <span>{market === "B2C" ? "Consumers" : "Businesses"}</span>
                <h3>{guide.title}</h3>
                <p>{guide.objective}</p>
                <small>
                  {guide.revisions[0]
                    ? `Published revision ${guide.revisions[0].version}`
                    : "Draft only"}
                </small>
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : (
              <div key={market} className="interview-guide-starter-empty">
                <Icon aria-hidden="true" />
                <span>{market === "B2C" ? "Consumers" : "Businesses"}</span>
                <h3>No starter yet</h3>
                <p>
                  Create both starter guides, then adapt the questions to this
                  exploration.
                </p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="exploration-stage-section">
        <header>
          <div>
            <p className="eyebrow">Guide ledger</p>
            <h3>Every guide</h3>
          </div>
          <BookOpenText aria-hidden="true" />
        </header>
        {guides.length > 0 ? (
          <div className="exploration-ledger interview-guide-ledger">
            {guides.map((guide) => (
              <Link
                key={guide.id}
                className="exploration-ledger-row"
                href={explorationHref(
                  nicheId,
                  `/learn/guides/${guide.id}/edit`,
                )}
              >
                <div className="exploration-ledger-primary">
                  <span>
                    {guide.marketType}
                    {guide.archivedAt ? " · Archived" : ""}
                  </span>
                  <strong>{guide.title}</strong>
                  <small>
                    {guide.segment?.name ?? "All relevant segments"}
                  </small>
                </div>
                <div className="exploration-ledger-secondary">
                  <span>{guide.expectedDurationMinutes} minutes</span>
                  <time dateTime={guide.savedAt.toISOString()}>
                    Saved {businessDate(guide.savedAt)}
                  </time>
                  <small>
                    {guide.revisions[0]
                      ? `Revision ${guide.revisions[0].version}`
                      : "Unpublished draft"}
                  </small>
                </div>
                <ArrowRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="exploration-stage-empty">
            <BookOpenText aria-hidden="true" />
            <div>
              <h3>No guides yet.</h3>
              <p>
                Use the B2C and B2B starters or author a focused guide of your
                own.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
