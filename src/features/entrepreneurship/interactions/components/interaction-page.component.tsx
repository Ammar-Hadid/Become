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
      <header className="business-section-heading">
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
      <div className="business-row-heading">
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
        <BatchOutreachForm companies={options.companies} />
      </div>
      <InteractionJournal userId={userId} nicheId={nicheId} {...query} />
    </>
  );
}
