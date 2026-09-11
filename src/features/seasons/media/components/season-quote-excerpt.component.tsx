import { seasonQuoteDisplay } from "@/features/seasons/media/utils/season-quote-display.util";
import type { SeasonQuoteView } from "@/features/seasons/types/season.types";
import { cn } from "@/lib/styles/utils/class-name.util";

export function SeasonQuoteExcerpt({
  quote,
  className,
}: {
  quote: SeasonQuoteView;
  className?: string;
}) {
  const display = seasonQuoteDisplay(quote);

  return (
    <blockquote
      className={cn(className)}
      data-content-form={display.isPassage ? "passage" : "quotation"}
    >
      <p>{display.text}</p>
      <cite>
        {display.attribution} · {display.formLabel} · {display.evidenceLabel}
      </cite>
    </blockquote>
  );
}
