"use client";
import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="business-empty business-zone">
      <h2>These records couldn’t be loaded.</h2>
      <p>Your saved work is still there.</p>
      <button
        className="finance-dialog-trigger finance-dialog-trigger--secondary"
        onClick={retry}
      >
        Try again
      </button>
    </div>
  );
}
