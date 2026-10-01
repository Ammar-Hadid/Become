"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, RefreshCw, Unplug } from "lucide-react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";
import {
  disconnectBankConnectionAction,
  startBankConnectionAction,
  syncBankConnectionAction,
} from "@/features/open-banking/connections/actions/bank-connection.action";

export function BankConnectionControls({
  connection,
}: {
  connection: {
    id: string;
    institutionName: string;
    institutionCountry: string;
    status: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (
    work: () => Promise<{ error: string | null; success?: string }>,
  ) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await work();
      if (result.error) setError(result.error);
      else {
        setMessage(result.success ?? "Saved.");
        router.refresh();
      }
    });
  };

  const reconnect = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await startBankConnectionAction({
        institutionName: connection.institutionName,
        institutionCountry: connection.institutionCountry,
        reconnectId: connection.id,
      });
      if (result.error || !result.url) {
        setError(
          result.error ?? "The bank did not provide an authorization link.",
        );
        return;
      }
      window.location.assign(result.url);
    });
  };

  const needsReconnect =
    connection.status === "REAUTH_REQUIRED" || connection.status === "FAILED";

  return (
    <div className="open-banking-connection-controls">
      {needsReconnect ? (
        <button
          className="finance-link-action finance-link-action--primary"
          type="button"
          disabled={pending}
          onClick={reconnect}
        >
          <RefreshCw aria-hidden="true" />
          {pending ? "Opening bank…" : "Reconnect"}
        </button>
      ) : connection.status === "CONNECTED" ? (
        <button
          className="open-banking-sync-button"
          type="button"
          disabled={pending}
          onClick={() => run(() => syncBankConnectionAction(connection.id))}
        >
          <RefreshCw aria-hidden="true" />
          {pending ? "Queuing…" : "Sync now"}
        </button>
      ) : null}

      {connection.status !== "DISCONNECTED" && (
        <SubMenu
          label={`${connection.institutionName} connection actions`}
          placement="bottom-end"
          trigger={(props) => (
            <button
              {...props}
              className="open-banking-more-button"
              disabled={pending}
            >
              <Ellipsis aria-hidden="true" />
            </button>
          )}
        >
          <MenuItem
            icon={<Unplug aria-hidden="true" />}
            onSelect={() =>
              run(() => disconnectBankConnectionAction(connection.id))
            }
          >
            Disconnect
          </MenuItem>
        </SubMenu>
      )}

      <span className="open-banking-control-feedback" aria-live="polite">
        {error || message}
      </span>
    </div>
  );
}
