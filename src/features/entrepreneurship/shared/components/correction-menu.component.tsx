"use client";
import { Button } from "@/components/ui/buttons/button.component";

import { MoreHorizontal } from "lucide-react";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { BusinessField } from "@/features/entrepreneurship/shared/components/business-field.component";
import { CaptureKey } from "@/features/entrepreneurship/shared/components/capture-key.component";
import type { RecordFormState } from "@/components/ui/forms/record-form.types";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
export function CorrectionMenu({
  label,
  title,
  description,
  action,
}: {
  label: string;
  title: string;
  description: string;
  action: (form: FormData) => Promise<RecordFormState>;
}) {
  const exploration = useExploration();
  if (exploration?.archived) return null;
  return (
    <SubMenu
      className="w-fit shrink-0"
      label={label}
      placement="bottom-end"
      closeOnSelect={false}
      trigger={(props) => (
        <Button variant="ghost" size="icon" {...props}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      )}
    >
      <RecordDialog
        treatment="workspace"
        eyebrow="History correction"
        triggerLabel={title}
        triggerRole="menuitem"
        icon={false}
        unstyledTrigger
        title={title}
        description={description}
      >
        <RecordForm
          action={action}
          closeOnSuccess
          submitLabel={title}
          submitVariant="danger"
        >
          <CaptureKey />
          <BusinessField label="Reason" name="reason" multiline required />
        </RecordForm>
      </RecordDialog>
    </SubMenu>
  );
}
