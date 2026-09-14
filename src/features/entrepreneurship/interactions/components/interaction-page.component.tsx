import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { InteractionForm } from "@/features/entrepreneurship/interactions/components/interaction-form.component";
import { BatchOutreachForm } from "@/features/entrepreneurship/interactions/components/batch-outreach-form.component";
import { InteractionJournal } from "@/features/entrepreneurship/interactions/components/interaction-journal.component";
import { interactionKinds } from "@/features/entrepreneurship/interactions/schemas/interaction.schema";
import { humanize } from "@/features/entrepreneurship/shared/utils/business.util";
export async function InteractionPage({
  userId,
  nicheId,
  query,
}: {
  userId: string;
  nicheId?: string;
  query: { kind?: string; companyId?: string; cursor?: string };
}) {
  const options = await getInteractionOptions(userId, nicheId);
  return (
    <>
      <header className="business-section-heading business-page-heading">
        <div>
          <p className="eyebrow">The conversation, kept</p>
          <h2>Reality has a voice.</h2>
          <p>
            Messages, conversations and the small details you don’t want to
            lose.
          </p>
        </div>
        <InteractionForm {...options} />
      </header>
      <section className="business-zone business-zone--ledger">
        <div className="business-row-heading business-toolbar-heading">
          <div>
            <p className="eyebrow">Chronological record</p>
            <h3>Interaction journal</h3>
          </div>
          <div className="business-actions">
            <form className="business-filter">
              <label className="sr-only" htmlFor="interaction-kind">
                Interaction kind
              </label>
              <select
                name="kind"
                id="interaction-kind"
                className="text-input"
                defaultValue={query.kind ?? ""}
              >
                <option value="">All interactions</option>
                {interactionKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {humanize(kind)}
                  </option>
                ))}
              </select>
              <button type="submit">Filter</button>
            </form>
            <BatchOutreachForm
              companies={options.companies}
              people={options.people}
              segments={options.segments}
            />
          </div>
        </div>
        <InteractionJournal userId={userId} nicheId={nicheId} {...query} />
      </section>
    </>
  );
}
