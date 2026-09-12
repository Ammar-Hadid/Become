import { ArrowUpRight } from "lucide-react";
import { ContentObservationDialog } from "@/features/content/results/components/content-observation-dialog.component";
import { ContentReleaseDialog } from "@/features/content/releases/components/content-release-dialog.component";
import type {
  ContentWorkspace,
  LatestMetric,
  VariantView,
} from "@/features/content/types/content.types";

function formatMetric(metric: LatestMetric) {
  if (!metric) return "Not reported";
  try {
    return BigInt(metric.value).toLocaleString();
  } catch {
    return metric.value;
  }
}

function formatFreshness(metric: LatestMetric) {
  if (!metric) return "No reading";
  return `Observed ${new Date(metric.observedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatLabel(format: VariantView["format"]) {
  if (format === "SHORT_VERTICAL") return "Short vertical";
  if (format === "LONG_FORM") return "Long form";
  return "Other format";
}

export function ContentReleaseHistory({
  workspace,
  variant,
  onWorkspace,
}: {
  workspace: ContentWorkspace;
  variant: VariantView;
  onWorkspace: (workspace: ContentWorkspace) => void;
}) {
  return (
    <section className="content-releases" aria-labelledby="releases-title">
      <header>
        <div>
          <p className="eyebrow">Release and learn</p>
          <h2 id="releases-title">One variant, every place it went.</h2>
          <p>
            Each number is a lifetime reading for one release. Platform, format,
            and observation date stay visible beside it.
          </p>
        </div>
        <ContentReleaseDialog
          workspace={workspace}
          variant={variant}
          onWorkspace={onWorkspace}
        />
      </header>

      {variant.publications.length ? (
        <ol className="content-release-list">
          {variant.publications.map((publication) => (
            <li key={publication.id}>
              <div className="content-release-identity">
                <span className="content-channel-sigil" aria-hidden="true">
                  {publication.channel.platformName.slice(0, 1)}
                </span>
                <span>
                  <strong>{publication.channel.displayName}</strong>
                  <small>
                    {publication.channel.platformName} ·{" "}
                    {formatLabel(variant.format)} · Released{" "}
                    <time dateTime={publication.publishedOn}>
                      {publication.publishedOn}
                    </time>
                    {publication.placement ? ` · ${publication.placement}` : ""}
                  </small>
                </span>
                {publication.url && (
                  <a
                    href={publication.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open release on ${publication.channel.displayName}`}
                  >
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                )}
              </div>
              <dl className="content-release-metrics">
                {(["views", "likes", "comments"] as const).map((metric) => (
                  <div key={metric}>
                    <dt>{metric}</dt>
                    <dd className="timer-numerals">
                      {formatMetric(publication.latest[metric])}
                    </dd>
                    <small>{formatFreshness(publication.latest[metric])}</small>
                  </div>
                ))}
              </dl>
              <div className="content-release-reading">
                <span>
                  {publication.observationCount
                    ? `${publication.observationCount} manual ${publication.observationCount === 1 ? "reading" : "readings"}`
                    : "No results recorded yet"}
                </span>
                <ContentObservationDialog
                  contentId={workspace.id}
                  publication={publication}
                  onWorkspace={onWorkspace}
                />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="content-release-empty">
          <span aria-hidden="true">01</span>
          <p>
            When this variant goes live, record every destination together. One
            release can have a URL while another waits for it.
          </p>
        </div>
      )}
    </section>
  );
}
