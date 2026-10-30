import { Card } from "@/components/ui/cards/card.component";
import "./character-quote-study.css";

export type CharacterQuoteVariant = "editorial" | "margin" | "framed";

export function CharacterQuoteStudy({
  variant,
}: {
  variant: CharacterQuoteVariant;
}) {
  return (
    <Card
      as="article"
      material={variant === "framed" ? "glass" : "elevated-glass"}
      spacing="dense"
      className="character-quote-study"
      data-variant={variant}
      aria-label="Become quotation"
    >
      <div className="character-quote-study-heading" aria-hidden="true">
        <span className="character-quote-study-mark type-metric-lg">“</span>
        <span className="character-quote-study-kicker type-overline">
          A NOTE FROM BECOME
        </span>
      </div>
      <blockquote>
        <p className="type-body-lg">
          A grounded character makes better conversations.
        </p>
        <footer>
          <span className="character-quote-study-rule" aria-hidden="true" />
          <cite className="type-label">Become</cite>
        </footer>
      </blockquote>
      <span
        className="character-quote-study-endmark type-metric-lg"
        aria-hidden="true"
      >
        ”
      </span>
    </Card>
  );
}
