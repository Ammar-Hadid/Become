"use client";

import { Archive, ArchiveRestore, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { useThinkingOperation } from "@/features/direction/thinking/commands/hooks/use-thinking-operation.hook";
import { sendThinkingCommand } from "@/features/direction/thinking/commands/utils/thinking-command.util";

export function DecisionActions({
  id,
  version,
  archived,
}: {
  id: string;
  version: number;
  archived: boolean;
}) {
  const router = useRouter();
  const run = useThinkingOperation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateArchive() {
    if (pending) return;
    setPending(true);
    setError(null);
    const nextArchived = !archived;
    const result = await run(
      { type: "ARCHIVE_DECISION", id, version, archived: nextArchived },
      (operationKey) =>
        sendThinkingCommand({
          type: "ARCHIVE_DECISION",
          operationKey,
          id,
          expectedVersion: version,
          archived: nextArchived,
        }),
    );
    setPending(false);
    if (result.error) return setError(result.error);
    router.refresh();
  }

  return (
    <div className="thinking-record-actions" aria-busy={pending}>
      <SubMenu
        label="Decision actions"
        placement="bottom-end"
        trigger={(props) => (
          <button {...props} disabled={pending}>
            <MoreHorizontal aria-hidden="true" /> Manage
          </button>
        )}
      >
        <MenuItem
          disabled={pending}
          icon={archived ? <ArchiveRestore /> : <Archive />}
          onSelect={() => void updateArchive()}
        >
          {archived ? "Restore decision" : "Archive decision"}
        </MenuItem>
      </SubMenu>
      {error && (
        <p className="thinking-form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
