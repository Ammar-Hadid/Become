export default function ScriptLoading() {
  return (
    <div className="page-shell py-xl" role="status" aria-label="Opening script">
      <div className="border-border pb-lg flex justify-between border-b">
        <span className="text-body text-text-secondary">Opening script…</span>
        <span
          className="bg-surface-elevated h-5 w-24 rounded-sm"
          aria-hidden="true"
        />
      </div>
      <div className="border-border h-14 border-b" aria-hidden="true" />
      <div className="max-w-copy pt-2xl mx-auto" aria-hidden="true">
        <div className="bg-surface-elevated mb-lg h-8 w-2/3 rounded-sm" />
        <div className="bg-surface-elevated mb-sm h-3 w-full rounded-sm" />
        <div className="bg-surface-elevated h-3 w-4/5 rounded-sm" />
      </div>
    </div>
  );
}
