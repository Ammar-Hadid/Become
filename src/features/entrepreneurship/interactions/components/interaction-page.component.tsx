import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
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
          <p className="eyebrow">Across explorations</p>
          <h2>Interactions</h2>
          <p>
            Messages, conversations and the small details you don’t want to
            lose.
          </p>
        </div>
        <InteractionForm {...options} />
      </header>
      <Card
        material="glass"
        spacing="dense"
        className="business-zone business-zone--ledger"
      >
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
              <NativeSelect
                name="kind"
                id="interaction-kind"

                defaultValue={query.kind ?? ""}
              >
                <option value="">All interactions</option>
                {interactionKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {humanize(kind)}
                  </option>
                ))}
              </NativeSelect>
              <Button variant="primary" type="submit">
                Filter
              </Button>
            </form>
            <BatchOutreachForm
              companies={options.companies}
              people={options.people}
              segments={options.segments}
            />
          </div>
        </div>
        <InteractionJournal userId={userId} nicheId={nicheId} {...query} />
      </Card>
    </>
  );
}
