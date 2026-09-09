import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";
import { CriterionPreview } from "@/features/direction/criteria/components/criterion-preview.component";
import { ManualAssessment } from "@/features/direction/evidence/components/manual-assessment.component";
import type { CriterionEvaluation } from "@/features/direction/types/direction.types";

export function CriterionDetail({
  criterion,
  ownerTitle,
  ownerHref,
  ownerVersion,
  ownerStatus,
}: {
  criterion: CriterionEvaluation;
  ownerTitle: string;
  ownerHref: string;
  ownerVersion: number;
  ownerStatus: "ACTIVE" | "PAUSED" | "CONCLUDED";
}) {
  return (
    <article className="direction-criterion-detail">
      <header className="direction-goal-masthead">
        <div>
          <Link className="direction-back-link" href={ownerHref}>
            <ArrowLeft aria-hidden="true" /> Back to {ownerTitle}
          </Link>
          <p className="eyebrow">One evidence definition</p>
          <h1>{criterion.label}</h1>
          <p>{criterion.qualification}</p>
        </div>
        <span className="direction-criterion-asof">
          <Clock3 aria-hidden="true" /> Evaluated{" "}
          {new Date(criterion.evaluatedAt).toLocaleString()}
        </span>
      </header>
      <CriterionPreview criterion={criterion} paginateSources />
      {criterion.metric === "MANUAL" && (
        <ManualAssessment
          criterion={criterion}
          ownerVersion={ownerVersion}
          ownerStatus={ownerStatus}
        />
      )}
    </article>
  );
}
