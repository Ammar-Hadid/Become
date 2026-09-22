"use client";

import { CircleAlert } from "lucide-react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section className="exploration-route-error" role="alert">
      <CircleAlert aria-hidden="true" />
      <div>
        <p className="eyebrow">This workspace did not open</p>
        <h2>The record is safe.</h2>
        <p>
          Become could not load this part of the exploration. Retry the read;
          unfinished form entries in another open dialog are not submitted.
        </p>
        {error.digest && <small>Reference {error.digest}</small>}
      </div>
      <button type="button" className="finance-dialog-trigger" onClick={retry}>
        Try again
      </button>
    </section>
  );
}
