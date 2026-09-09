"use client";

import { useCallback, useRef, useState } from "react";
import { sendDirectionCommand } from "@/features/direction/commands/utils/direction-command-client.util";
import { useStableOperation } from "@/features/direction/commands/hooks/use-stable-operation.hook";
import type {
  CommandResult,
  GoalDraft,
  GoalView,
} from "@/features/direction/types/direction.types";

export type GoalSaveState = "idle" | "saving" | "error" | "conflict";

export function useGoalSave(goal?: GoalView) {
  const [state, setState] = useState<GoalSaveState>("idle");
  const [result, setResult] = useState<CommandResult>({ error: null });
  const [recoveredDraft, setRecoveredDraft] = useState(false);
  const [baseId, setBaseId] = useState(goal?.id);
  const baseRef = useRef({ id: goal?.id, version: goal?.version });
  const runStable = useStableOperation();

  const saveGoal = useCallback(
    async (draft: GoalDraft, reason?: string) => {
      setState("saving");
      const identity = {
        type: "SAVE_GOAL" as const,
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
      if (!response.error) {
        setState("idle");
      } else {
        setState(
          /changed|current version|stale|conflict/i.test(response.error)
            ? "conflict"
            : "error",
        );
      }
      return response;
    },
    [runStable],
  );

  return {
    fieldErrors: result.fieldErrors ?? {},
    result,
    recoveredDraft,
    requiresRevisionReason: Boolean(baseId),
    saveGoal,
    state,
  };
}
