export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="gap-md flex items-center">
      <div className="brand-mark" aria-hidden="true">
        <span />
      </div>
      {!compact && (
        <span className="text-text-primary font-semibold tracking-[-0.03em]">
          Become
        </span>
      )}
    </div>
  );
}
