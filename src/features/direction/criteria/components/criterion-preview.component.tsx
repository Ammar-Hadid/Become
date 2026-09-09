import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { CriterionEvaluation } from "@/features/direction/types/direction.types";
import { CriterionSourceList } from "@/features/direction/evidence/components/criterion-source-list.component";

export function CriterionPreview({
  criterion,
  paginateSources = false,
  detailHref,
}: {
  criterion: CriterionEvaluation;
  paginateSources?: boolean;
  detailHref?: string;
}) {
  return (
    <section
      className="direction-criterion-preview"
      aria-label={`Evidence preview for ${criterion.label}`}
    >
      <header>
        <div>
          <span data-state={criterion.reached ?? "unknown"}>
            {criterion.reached === true ? (
              <CheckCircle2 aria-hidden="true" />
            ) : criterion.reached === false ? (
              <CircleDashed aria-hidden="true" />
            ) : (
              <AlertCircle aria-hidden="true" />
            )}
            {criterion.availability.replaceAll("_", " ").toLowerCase()}
          </span>
          <h3>
            {detailHref ? (
              <Link href={detailHref}>{criterion.label}</Link>
            ) : (
              criterion.label
            )}
          </h3>
        </div>
        <strong>
          {criterion.valueLabel}
          {criterion.targetLabel ? ` / ${criterion.targetLabel}` : ""}
        </strong>
      </header>
      <p>{criterion.qualification}</p>
      {criterion.conditions.length > 0 && (
        <ul className="direction-condition-list">
          {criterion.conditions.map((condition) => (
            <li
              key={condition.label}
              data-state={condition.reached ?? "unknown"}
            >
              <span>
                {condition.reached === true
                  ? "Met"
                  : condition.reached === false
                    ? "Not met"
                    : "Needs review"}
              </span>
              <div>
                <strong>{condition.label}</strong>
                <p>{condition.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {criterion.exclusions.length > 0 && (
        <details>
          <summary>What this definition excludes</summary>
          <ul>
            {criterion.exclusions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}
      {criterion.caveats.length > 0 && (
        <details>
          <summary>Limits of this reading</summary>
          <ul>
            {criterion.caveats.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}
      {paginateSources && criterion.sourceCount > 0 ? (
        <CriterionSourceList
          key={criterion.fingerprint}
          criterionId={criterion.id}
          initialSources={criterion.sources}
          initialCursor={criterion.nextCursor}
          initialFingerprint={criterion.fingerprint}
          sourceCount={criterion.sourceCount}
        />
      ) : (
        criterion.sources.length > 0 && (
          <div className="direction-preview-sources">
            <p className="eyebrow">Source records in this reading</p>
            {criterion.sources.slice(0, 4).map((source) =>
              source.href ? (
                <Link href={source.href} key={source.id}>
                  <span>
                    <strong>{source.label}</strong>
                    {source.note && <small>{source.note}</small>}
                  </span>
                  <em data-state={source.state}>
                    {source.state.toLowerCase()}
                  </em>
                  <small>{source.value}</small>
                  <ArrowRight aria-hidden="true" />
                </Link>
              ) : (
                <div key={source.id}>
                  <span>
                    <strong>{source.label}</strong>
                    {source.note && <small>{source.note}</small>}
                  </span>
                  <em data-state={source.state}>
                    {source.state.toLowerCase()}
                  </em>
                  <small>{source.value}</small>
                </div>
              ),
            )}
            {criterion.sourceCount > criterion.sources.slice(0, 4).length && (
              <small>
                {criterion.sourceCount - criterion.sources.slice(0, 4).length}{" "}
                more source records are available after saving.
              </small>
            )}
          </div>
        )
      )}
    </section>
  );
}
