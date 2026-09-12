import { Check, CircleAlert, CloudUpload, LockKeyhole } from "lucide-react";
import type { ContentScriptSaveStatus } from "@/features/content/editor/hooks/content-script-autosave.hook";

function savedTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContentScriptSaveState({
  activity,
  readOnly,
  savedAt,
  status,
}: {
  activity?: string | null;
  readOnly: boolean;
  savedAt: string | null;
  status: ContentScriptSaveStatus;
}) {
  if (activity) {
    return (
      <span
        className="content-script-save-state"
        data-state="activity"
        role="status"
        aria-live="polite"
      >
        <CloudUpload aria-hidden="true" /> {activity}
      </span>
    );
  }

  if (readOnly) {
    return (
      <span className="content-script-save-state" data-state="readonly">
        <LockKeyhole aria-hidden="true" /> Archived variant
      </span>
    );
  }

  const time = savedTime(savedAt);
  const content = {
    conflict: (
      <>
        <CircleAlert aria-hidden="true" /> Review needed
      </>
    ),
    dirty: (
      <>
        <span className="content-script-status-mark" aria-hidden="true" />
        Unsaved changes
      </>
    ),
    error: (
      <>
        <CircleAlert aria-hidden="true" /> Save interrupted
      </>
    ),
    saved: (
      <>
        <Check aria-hidden="true" /> {time ? `Saved ${time}` : "Saved"}
      </>
    ),
    saving: (
      <>
        <CloudUpload aria-hidden="true" /> Saving…
      </>
    ),
  } satisfies Record<ContentScriptSaveStatus, React.ReactNode>;

  return (
    <span
      className="content-script-save-state"
      data-state={status}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {content[status]}
    </span>
  );
}
