import Image from "next/image";
import { Check, Sparkles } from "lucide-react";

export function FeaturedCardContent({
  example = "recap",
}: {
  example?: "recap" | "summary";
}) {
  return (
    <>
      <header className="featured-card-example__heading">
        <Sparkles aria-hidden="true" />
        <h2 className="type-section-title">
          {example === "recap"
            ? "What you’re bringing into this Season"
            : "AI-prepared Season summary"}
        </h2>
      </header>
      <div className="featured-card-example__identity">
        <Image
          src="/design-review/character-workspace-v3/levi-avatar.webp"
          width={64}
          height={64}
          alt="Levi Ackerman · illustrative portrait"
          unoptimized
        />
        <div>
          <p className="type-widget-title">Levi Ackerman</p>
          <p className="type-body-sm">Attack on Titan · TV anime</p>
        </div>
      </div>
      {example === "recap" ? (
        <dl className="featured-card-example__recap">
          <div>
            <dt>
              <Check aria-hidden="true" />
              Character &amp; voice
            </dt>
            <dd>
              Quiet, observant and exacting. Short, direct sentences; practical
              encouragement and restrained praise.
            </dd>
          </div>
          <div>
            <dt>
              <Check aria-hidden="true" />
              World &amp; mood
            </dt>
            <dd>
              A quiet city at the edge of the mountains. Calm, cinematic, early
              morning light.
            </dd>
          </div>
          <div>
            <dt>
              <Check aria-hidden="true" />
              Banners &amp; portrait
            </dt>
            <dd>
              Desktop and mobile banners, with a separate profile portrait.
            </dd>
          </div>
          <div>
            <dt>
              <Check aria-hidden="true" />
              Evolving scenes
            </dt>
            <dd>
              7 chapters · 3 pace states · 42 desktop and mobile compositions.
            </dd>
          </div>
        </dl>
      ) : (
        <div className="featured-card-example__prose type-body">
          <p>
            Levi brings a quiet, exacting presence to this Season. His care
            comes through practical action: noticing the details, taking
            responsibility and making the next attempt count.
          </p>
          <p>
            His voice stays short and direct, with concrete observations before
            advice. Praise is specific; setbacks receive a clear next step.
            Unverified phrases and quotations are left out.
          </p>
          <p>
            The world is a quiet mountain city in early morning light.
            Recognizable clothing, expression and landmarks carry through each
            chapter as the environment develops around him.
          </p>
        </div>
      )}
    </>
  );
}
