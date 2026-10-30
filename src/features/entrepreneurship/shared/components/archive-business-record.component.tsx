"use client";
import { Button } from "@/components/ui/buttons/button.component";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { archiveBusinessRecordAction } from "@/features/entrepreneurship/shared/actions/archive-business-record.action";
import { useExploration } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
export function ArchiveBusinessRecord({
  kind,
  id,
  archived,
}: {
  kind: "problem" | "offer";
  id: string;
  archived: boolean;
}) {
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exploration = useExploration();
  if (exploration?.archived) return null;
  return (
    <div aria-busy={pending}>
      <SubMenu
        label={`${kind} actions`}
        placement="bottom-end"
        trigger={(props) => (
          <Button variant="ghost" size="icon" {...props} disabled={pending}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        )}
      >
        <MenuItem
          disabled={pending}
          onSelect={() =>
            start(async () => {
              try {
                setNotice(null);
                const result = await archiveBusinessRecordAction(
                  kind,
                  id,
                  !archived ? false : true,
                );
                setError(result.error);
                if (!result.error)
                  setNotice(
                    `${kind === "problem" ? "Problem" : "Offer"} ${archived ? "restored" : "archived"}.`,
                  );
              } catch {
                setError("Could not save. Try again.");
              }
            })
          }
        >
          {archived ? "Restore" : "Archive"} {kind}
        </MenuItem>
      </SubMenu>
      {notice && (
        <p role="status" className="business-hint">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
