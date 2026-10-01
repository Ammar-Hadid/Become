"use client";

import { useRouter } from "next/navigation";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { resolveEvidenceAction } from "@/features/finance/review/actions/financial-review.action";

type OverlapCandidate = {
  id: string;
  label: string;
};

export function StatementOverlapResolution({
  observationId,
  candidates,
}: {
  observationId: string;
  candidates: OverlapCandidate[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <details className="finance-statement-overlap">
      <summary>Resolve possible overlap</summary>
      <div>
        <p>
          Choose whether this row is new evidence, the same event as an existing
          transaction, or should be left out.
        </p>
        {!!candidates.length && (
          <FinanceForm
            action={resolveEvidenceAction}
            submitLabel="Use existing transaction"
            submitVariant="secondary"
            formClassName="finance-statement-overlap-form"
            showSuccess={false}
            onSaved={refresh}
          >
            <input type="hidden" name="observationId" value={observationId} />
            <input type="hidden" name="decision" value="duplicate" />
            <label>
              <span className="field-label">Existing transaction</span>
              <span className="select-wrap">
                <select
                  className="finance-select"
                  name="transactionId"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose matching event
                  </option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </FinanceForm>
        )}
        <div className="finance-statement-overlap-actions">
          <FinanceForm
            action={resolveEvidenceAction}
            submitLabel="Keep as new"
            submitVariant="secondary"
            formClassName=""
            showSuccess={false}
            onSaved={refresh}
          >
            <input type="hidden" name="observationId" value={observationId} />
            <input type="hidden" name="decision" value="distinct" />
          </FinanceForm>
          <FinanceForm
            action={resolveEvidenceAction}
            submitLabel="Leave row out"
            submitVariant="ghost"
            formClassName=""
            showSuccess={false}
            onSaved={refresh}
          >
            <input type="hidden" name="observationId" value={observationId} />
            <input type="hidden" name="decision" value="ignore" />
          </FinanceForm>
        </div>
      </div>
    </details>
  );
}
