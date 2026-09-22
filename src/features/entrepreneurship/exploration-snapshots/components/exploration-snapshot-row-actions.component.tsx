"use client";

import { useState, useTransition } from "react";
import { Archive, Check, MoreHorizontal, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import {
  SubMenu,
  useSubMenuClose,
} from "@/components/ui/menus/submenu.component";
import {
  BusinessField,
  BusinessSelect,
} from "@/features/entrepreneurship/shared/components/business-field.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import {
  archiveExplorationClaimAction,
  correctExplorationClaimAction,
  correctExplorationUncertaintyAction,
  resolveExplorationUncertaintyAction,
} from "@/features/entrepreneurship/exploration-snapshots/actions/exploration-snapshot.action";
import {
  readSnapshotCitations,
  SnapshotCitationFields,
  type CitationValue,
  type ObservationChoice,
} from "@/features/entrepreneurship/exploration-snapshots/components/exploration-snapshot-forms.component";

type ClaimActionValue = {
  id: string;
  nicheId: string;
  version: number;
  lane: string;
  kind: string;
  statement: string;
  citations: CitationValue[];
};

type UncertaintyActionValue = {
  id: string;
  nicheId: string;
  version: number;
  lane: string;
  statement: string;
};

function MenuDialog({
  label,
  title,
  description,
  icon,
  children,
}: {
  label: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const closeMenu = useSubMenuClose();
  return (
    <RecordDialog
      eyebrow="Living record"
      triggerLabel={label}
      title={title}
      description={description}
      triggerIcon={icon}
      unstyledTrigger
      className="menu-item"
      triggerRole="menuitem"
      onOpenChange={(open) => {
        if (!open) closeMenu(true);
      }}
    >
      {children}
    </RecordDialog>
  );
}

function ClaimCorrection({
  claim,
  observations,
}: {
  claim: ClaimActionValue;
  observations: ObservationChoice[];
}) {
  const router = useRouter();
  const [citationIds, setCitationIds] = useState(() =>
    claim.citations.length > 0
      ? claim.citations.map((_, index) => `existing-${index}`)
      : ["new-0"],
  );
  const citations = claim.citations.map((citation) => {
    const current = observations.find(
      (observation) => observation.id === citation.observationId,
    );
    return current
      ? { ...citation, observationRevisionId: current.revisionId }
      : citation;
  });
  return (
    <MenuDialog
      label="Correct finding"
      title="Correct this finding"
      description="The current wording stays in history. State why it changed and keep the corrected version grounded in observations."
      icon={<Pencil aria-hidden="true" />}
    >
      <RecordForm
        action={async (data) =>
          correctExplorationClaimAction(
            claim.id,
            String(data.get("captureKey")),
            {
              nicheId: claim.nicheId,
              expectedVersion: claim.version,
              lane: String(data.get("lane")),
              kind: String(data.get("kind")),
              statement: String(data.get("statement")),
              correctionReason: String(data.get("correctionReason")),
              citations: readSnapshotCitations(data, citationIds, "correction"),
            },
          )
        }
        closeOnSuccess
        submitLabel="Keep corrected version"
        onSaved={() => router.refresh()}
      >
        <CaptureKey />
        <BusinessSelect label="Market" name="lane" value={claim.lane}>
          <option value="B2C">Consumers</option>
          <option value="B2B">Businesses</option>
          <option value="CROSS_MARKET">Cross-market</option>
        </BusinessSelect>
        <BusinessSelect label="Finding type" name="kind" value={claim.kind}>
          <option value="OBSERVED">Observed fact</option>
          <option value="INTERPRETATION">Interpretation</option>
        </BusinessSelect>
        <BusinessField
          label="Finding"
          name="statement"
          multiline
          required
          value={claim.statement}
        />
        <SnapshotCitationFields
          observations={observations}
          citationIds={citationIds}
          setCitationIds={setCitationIds}
          prefix="correction"
          initial={citations}
        />
        <BusinessField
          label="Why is this correction needed?"
          name="correctionReason"
          multiline
          required
        />
      </RecordForm>
    </MenuDialog>
  );
}

function ClaimArchive({ claimId }: { claimId: string }) {
  const router = useRouter();
  return (
    <MenuDialog
      label="Archive finding"
      title="Archive this finding?"
      description="It leaves the living Snapshot but remains in published historical editions."
      icon={<Archive aria-hidden="true" />}
    >
      <RecordForm
        action={async (data) =>
          archiveExplorationClaimAction(claimId, String(data.get("captureKey")))
        }
        closeOnSuccess
        submitLabel="Archive finding"
        submitVariant="danger"
        onSaved={() => router.refresh()}
      >
        <CaptureKey />
        <p className="business-form-note">
          Earlier editions keep the exact version they originally published.
        </p>
      </RecordForm>
    </MenuDialog>
  );
}

export function SnapshotClaimActions({
  claim,
  observations,
}: {
  claim: ClaimActionValue;
  observations: ObservationChoice[];
}) {
  return (
    <SubMenu
      label="Finding actions"
      placement="bottom-end"
      closeOnSelect={false}
      trigger={(props) => (
        <button {...props} className="business-icon-button">
          <MoreHorizontal aria-hidden="true" />
        </button>
      )}
    >
      <ClaimCorrection claim={claim} observations={observations} />
      <ClaimArchive claimId={claim.id} />
    </SubMenu>
  );
}

function UncertaintyCorrection({
  uncertainty,
}: {
  uncertainty: UncertaintyActionValue;
}) {
  const router = useRouter();
  return (
    <MenuDialog
      label="Correct question"
      title="Correct this open question"
      description="The earlier wording remains in history. Explain the correction so the trail stays honest."
      icon={<Pencil aria-hidden="true" />}
    >
      <RecordForm
        action={async (data) =>
          correctExplorationUncertaintyAction(
            uncertainty.id,
            String(data.get("captureKey")),
            {
              nicheId: uncertainty.nicheId,
              expectedVersion: uncertainty.version,
              lane: String(data.get("lane")),
              statement: String(data.get("statement")),
              correctionReason: String(data.get("correctionReason")),
            },
          )
        }
        closeOnSuccess
        submitLabel="Keep corrected question"
        onSaved={() => router.refresh()}
      >
        <CaptureKey />
        <BusinessSelect label="Market" name="lane" value={uncertainty.lane}>
          <option value="B2C">Consumers</option>
          <option value="B2B">Businesses</option>
          <option value="CROSS_MARKET">Cross-market</option>
        </BusinessSelect>
        <BusinessField
          label="What remains uncertain?"
          name="statement"
          multiline
          required
          value={uncertainty.statement}
        />
        <BusinessField
          label="Why is this correction needed?"
          name="correctionReason"
          multiline
          required
        />
      </RecordForm>
    </MenuDialog>
  );
}

function ResolveUncertainty({ uncertaintyId }: { uncertaintyId: string }) {
  const router = useRouter();
  const closeMenu = useSubMenuClose();
  const [pending, startTransition] = useTransition();
  return (
    <MenuItem
      icon={<Check aria-hidden="true" />}
      disabled={pending}
      onSelect={() =>
        startTransition(async () => {
          const result = await resolveExplorationUncertaintyAction(
            uncertaintyId,
            crypto.randomUUID(),
          );
          if (!result.error) {
            closeMenu();
            router.refresh();
          }
        })
      }
    >
      Mark resolved
    </MenuItem>
  );
}

export function SnapshotUncertaintyActions({
  uncertainty,
}: {
  uncertainty: UncertaintyActionValue;
}) {
  return (
    <SubMenu
      label="Open question actions"
      placement="bottom-end"
      closeOnSelect={false}
      trigger={(props) => (
        <button {...props} className="business-icon-button">
          <MoreHorizontal aria-hidden="true" />
        </button>
      )}
    >
      <UncertaintyCorrection uncertainty={uncertainty} />
      <ResolveUncertainty uncertaintyId={uncertainty.id} />
    </SubMenu>
  );
}
