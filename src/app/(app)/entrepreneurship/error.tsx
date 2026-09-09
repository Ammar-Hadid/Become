"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="business-empty business-zone">
      <h2>These records couldn’t be loaded.</h2>
      <p>Your saved work is still there.</p>
      <button
        className="finance-dialog-trigger finance-dialog-trigger--secondary"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}
