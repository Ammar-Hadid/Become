import Link from "next/link";
import { ArrowRight, BookOpenText, Building2, UserRound } from "lucide-react";
import { getInterviewGuideIndex } from "@/features/entrepreneurship/interview-guides/queries/interview-guide.query";
import { getAudienceOptions } from "@/features/entrepreneurship/audiences/queries/audience.query";
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
  const guideHref = (suffix = "") =>
    explorationHref(nicheId, `/conversations/guides${suffix}`);
  return (
    <div className="interview-guide-index">
      <header className="interview-guide-index-heading">
        <div>
          <p className="eyebrow">Conversation guides</p>
          <h1>Prepare enough to listen well.</h1>
          <p>
            Write context, reminders, and optional questions in one document.
            Published editions stay pinned to the conversations that used them.
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
      <section
        className="interview-guide-starters"
        aria-labelledby="starter-guides-title"
      >
        <header>
          <p className="eyebrow">Starting points</p>
          <h2 id="starter-guides-title">Starting points</h2>
        </header>
        <div>
          {(["B2C", "B2B"] as const).map((market) => {
            const guide = starter(market);
            const Icon = market === "B2C" ? UserRound : Building2;
            return guide ? (
              <Link
                key={market}
                href={guideHref(`/${guide.id}/edit`)}
              >
                <Icon aria-hidden="true" />
                <span>{market === "B2C" ? "Consumers" : "Businesses"}</span>
                <div>
                  <strong>{guide.title}</strong>
                  <small>
                    {guide.revisions[0]
                      ? `Published edition ${guide.revisions[0].version}`
                      : "Draft only"}
                  </small>
                </div>
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : (
              <div key={market} className="interview-guide-starter-empty">
                <Icon aria-hidden="true" />
                <span>{market === "B2C" ? "Consumers" : "Businesses"}</span>
                <div>
                  <strong>No starter yet</strong>
                  <small>Create the starters, then adapt them here.</small>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="interview-guide-ledger-section">
        <header>
          <div>
            <p className="eyebrow">Guide ledger</p>
            <h2>Every guide</h2>
          </div>
          <BookOpenText aria-hidden="true" />
        </header>
        {guides.length > 0 ? (
          <div className="exploration-ledger interview-guide-ledger">
            {guides.map((guide) => (
              <Link
                key={guide.id}
                className="exploration-ledger-row"
                href={guideHref(`/${guide.id}/edit`)}
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
                      ? `Edition ${guide.revisions[0].version}`
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
