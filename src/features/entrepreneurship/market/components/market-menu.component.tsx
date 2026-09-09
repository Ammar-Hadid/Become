"use client";
import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import { archiveMarketAction } from "@/features/entrepreneurship/market/actions/market.action";
export function MarketMenu({
  kind,
  id,
  archived,
}: {
  kind: "company" | "niche";
  id: string;
  archived: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <SubMenu
        label={`${kind} actions`}
        placement="bottom-end"
        trigger={(props) => (
          <button {...props} className="business-icon-button">
            <MoreHorizontal aria-hidden="true" />
          </button>
        )}
      >
        <button
          role="menuitem"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await archiveMarketAction(kind, id, archived);
              setError(result.error);
            })
          }
        >
          {archived ? "Restore" : "Archive"} {kind}
        </button>
      </SubMenu>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
