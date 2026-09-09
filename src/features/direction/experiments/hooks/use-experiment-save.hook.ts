"use client";

import { useCallback, useRef, useState } from "react";
import { sendDirectionCommand } from "@/features/direction/commands/utils/direction-command-client.util";
import { useStableOperation } from "@/features/direction/commands/hooks/use-stable-operation.hook";
import type {
  CommandResult,
  ExperimentDraft,
  ExperimentView,
} from "@/features/direction/types/direction.types";

export function useExperimentSave(experiment?: ExperimentView) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CommandResult>({ error: null });
  const [recoveredDraft, setRecoveredDraft] = useState(false);
  const [baseId, setBaseId] = useState(experiment?.id);
  const baseRef = useRef({ id: experiment?.id, version: experiment?.version });
  const runStable = useStableOperation();

  const save = useCallback(
    async (draft: ExperimentDraft, reason?: string) => {
      setPending(true);
      const identity = {
        type: "SAVE_EXPERIMENT" as const,
        id: baseRef.current.id,
        expectedVersion: baseRef.current.version,
        draft,
        reason,
      };
      const response = await runStable(identity, (operationKey) =>
        sendDirectionCommand({ ...identity, operationKey }),
      );
      setResult(response);
      if (response.id && response.version !== undefined) {
        baseRef.current = { id: response.id, version: response.version };
        setBaseId(response.id);
      }
      setRecoveredDraft(Boolean(response.recoveredPrevious));
      setPending(false);
      return response;
    },
    [runStable],
  );

  return {
    fieldErrors: result.fieldErrors ?? {},
    pending,
    result,
    recoveredDraft,
    requiresRevisionReason: Boolean(baseId),
    save,
  };
}
