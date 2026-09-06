"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { CheckCircle2, Clock3, Split } from "lucide-react";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import {
  distributeMoney,
  formatMoney,
  moneyDecimal,
  parseMoney,
} from "@/lib/money/utils/money.util";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import {
  FinanceField,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { allocatePaymentAction } from "@/features/finance/payments/actions/payment-allocation.action";
import type { getPaymentCandidates } from "@/features/finance/payments/queries/payment-candidates.query";

type Candidates = Awaited<ReturnType<typeof getPaymentCandidates>>;

export function PaymentAllocation({
  transactionId,
  currency,
  amountMinor,
  candidates,
}: {
  transactionId: string;
  currency: string;
  amountMinor: string;
  candidates: Candidates;
}) {
  const [selected, setSelected] = useState(
    candidates
      .filter((candidate) => candidate.amount !== null)
      .map((candidate) => candidate.id),
  );
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(
      candidates.map((candidate) => [
        candidate.id,
        candidate.amount === null
          ? ""
          : moneyDecimal(BigInt(candidate.amount), currency),
      ]),
    ),
  );
  const [draftError, setDraftError] = useState<string>();
  let allocated: bigint | null = 0n;
  try {
    for (const id of selected) {
      allocated += parseMoney(amounts[id] || "0", currency);
    }
  } catch {
    allocated = null;
  }
  const remainder = allocated === null ? null : BigInt(amountMinor) - allocated;

  return (
    <FinanceForm
      action={allocatePaymentAction}
      submitLabel="Confirm payment attribution"
    >
      <input type="hidden" name="transactionId" value={transactionId} />
      <div className="finance-payment-split-summary">
        <div>
          <span>Payment to connect</span>
          <strong className="finance-number">
            {formatMoney(amountMinor, currency)}
          </strong>
        </div>
        <div className={remainder === 0n ? "is-settled" : ""}>
          <span>
            {remainder === 0n ? "Fully connected" : "Still unassigned"}
          </span>
          <strong className="finance-number">
            {remainder === null
              ? "Check amounts"
              : formatMoney(remainder, currency)}
          </strong>
        </div>
      </div>

      {!candidates.length ? (
        <div className="finance-payment-empty">
          <Clock3 aria-hidden="true" />
          <div>
            <strong>No completed paid work to connect yet</strong>
            <p>
              Track a paid-work session with the timer, then return here to
              connect the payment.
            </p>
          </div>
        </div>
      ) : (
        <p className="finance-allocation-guidance">
          Choose the work this payment covered. Suggested sessions are based on
          the relationships and dates you already recorded.
        </p>
      )}

      <button
        type="button"
        className="finance-allocation-draft"
        disabled={!selected.length}
        onClick={() => {
          try {
            const chosen = candidates.filter((candidate) =>
              selected.includes(candidate.id),
            );
            const draft = distributeMoney(
              BigInt(amountMinor),
              chosen.map((candidate) => BigInt(candidate.durationSeconds)),
            );
            setAmounts((current) => ({
              ...current,
              ...Object.fromEntries(
                chosen.map((candidate, index) => [
                  candidate.id,
                  moneyDecimal(draft[index], currency),
                ]),
              ),
            }));
            setDraftError(undefined);
          } catch (error) {
            setDraftError((error as Error).message);
          }
        }}
      >
        <Split aria-hidden="true" />
        Divide by time spent
      </button>
      {draftError && <p className="form-error">{draftError}</p>}

      <div className="finance-payment-candidates">
        {candidates.map((candidate) => (
          <article
            className={
              selected.includes(candidate.id) ? "is-selected" : undefined
            }
            key={candidate.id}
          >
            <label>
              <input
                type="checkbox"
                name="sessionId"
                value={candidate.id}
                checked={selected.includes(candidate.id)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, candidate.id]
                      : current.filter((id) => id !== candidate.id),
                  )
                }
              />
              <span className="finance-payment-candidate-copy">
                <strong>{candidate.description}</strong>
                <span>{candidate.workSourceName}</span>
                <small>
                  {DateTime.fromISO(candidate.startedAt)
                    .setZone(APP_TIMEZONE)
                    .toFormat("d LLL yyyy, HH:mm")}{" "}
                  · {Math.floor(candidate.durationSeconds / 60)} min ·{" "}
                  {candidate.complete
                    ? "Fully accounted for"
                    : "Payment review needed"}
                </small>
              </span>
              {candidate.complete && (
                <CheckCircle2
                  className="finance-payment-candidate-status"
                  aria-label="Already fully accounted for"
                />
              )}
            </label>

            {selected.includes(candidate.id) && (
              <div className="finance-payment-candidate-amount">
                <FinanceField
                  label={`Amount for ${candidate.description} (${currency})`}
                  name={`amount:${candidate.id}`}
                  value={amounts[candidate.id] || ""}
                  onChange={(event) =>
                    setAmounts((current) => ({
                      ...current,
                      [candidate.id]: event.target.value,
                    }))
                  }
                  inputMode="decimal"
                  required
                />
              </div>
            )}

            {candidate.reasons.length > 0 && (
              <details className="finance-candidate-reasons">
                <summary>Why this work was suggested</summary>
                <p>{candidate.reasons.join(" · ")}</p>
              </details>
            )}
          </article>
        ))}
      </div>

      <FinanceSelect
        label="Does this settle the selected work?"
        aria-label="Are selected sessions fully accounted for?"
        name="completeness"
        defaultValue="unsure"
      >
        <option value="yes">Yes, this work is fully accounted for</option>
        <option value="no">No, more payment is still expected</option>
        <option value="unsure">I’m not sure yet</option>
      </FinanceSelect>
    </FinanceForm>
  );
}
