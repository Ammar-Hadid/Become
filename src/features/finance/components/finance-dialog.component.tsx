"use client";

import type { ComponentProps } from "react";
import { RecordDialog } from "@/components/ui/forms/record-dialog.component";
export { useRecordDialogClose as useFinanceDialogClose } from "@/components/ui/forms/record-dialog.component";

export function FinanceDialog(props: ComponentProps<typeof RecordDialog>) {
  return (
    <RecordDialog
      {...props}
      treatment={
        props.treatment ?? (props.unstyledTrigger ? "legacy" : "workspace")
      }
    />
  );
}
