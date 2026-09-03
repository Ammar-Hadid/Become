export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="brand-mark" aria-hidden="true">
        <span />
      </div>
      {!compact && (
        <span className="font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
          Become
        </span>
      )}
    </div>
  );
}
