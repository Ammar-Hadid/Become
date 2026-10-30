export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="become-brand">
      <svg
        className="become-brand__symbol"
        viewBox="139 165 725 725"
        role="img"
        aria-label={compact ? "Become" : undefined}
        aria-hidden={compact ? undefined : true}
      >
        <g
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="var(--brand-symbol-weight)"
          strokeLinejoin="round"
        >
          <path d="M159 870 L350 579 C370 550 381 529 381 494 L381 234 C381 207 398 185 426 185 L591 185 C647 185 685 225 685 279 C685 317 665 348 626 367 C668 383 690 414 690 455 C690 495 670 523 638 542 C647 570 667 596 682 620 L844 870 L792 870 L635 608 C617 580 605 553 599 536 C636 522 655 496 655 457 C655 408 623 378 559 377 C549 377 549 364 559 364 C615 360 651 330 651 280 C651 244 626 217 591 217 L431 217 C422 217 417 222 417 232 L417 494 C417 533 403 559 379 594 L213 870 Z" />
          <path d="M506 563 L521 563 L527 610 L501 610 Z" />
          <path d="M498 639 L529 639 L536 707 L492 707 Z" />
          <path d="M488 747 L539 747 L551 868 L477 868 Z" />
        </g>
      </svg>
      {!compact && (
        <span className="become-brand__wordmark type-section-title">
          Become
        </span>
      )}
    </span>
  );
}
