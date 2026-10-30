"use client";

import { Card } from "@/components/ui/cards/card.component";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Lightbulb } from "lucide-react";
import { IdeaActions } from "@/features/direction/thinking/ideas/components/idea-actions.component";
import { IdeaEditor } from "@/features/direction/thinking/ideas/components/idea-editor.component";
import { IdeaPromote } from "@/features/direction/thinking/ideas/components/idea-promote.component";
import { ThinkingPagination } from "@/features/direction/thinking/shared/components/thinking-pagination.component";
import type {
  IdeaView,
  ThinkingOptions,
} from "@/features/direction/thinking/types/thinking.types";

const historyLabels: Record<string, string> = {
  CREATED: "Idea parked",
  EDITED: "Idea refined",
  ARCHIVED: "Idea archived",
  RESTORED: "Idea restored",
  PROMOTED: "New work created",
  LINKED: "Existing work linked",
};

function ideaSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const value = snapshot as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title : "";
  const notes = typeof value.notes === "string" ? value.notes : "";
  return title || notes ? { title, notes } : null;
}

export function IdeaDetail({
  idea,
  options,
  defaultStartOn,
}: {
  idea: IdeaView;
  options: ThinkingOptions;
  defaultStartOn: string;
}) {
  return (
    <article className="thinking-detail idea-detail">
      <Link href="/direction/ideas" className="thinking-back-link">
        <ArrowLeft aria-hidden="true" /> Back to Ideas
      </Link>
      <header className="thinking-detail-header">
        <span className="thinking-detail-mark" aria-hidden="true">
          <Lightbulb />
        </span>
        <div>
          <p className="eyebrow">An idea worth returning to</p>
          <h1>{idea.title}</h1>
          <p className="thinking-detail-date">
            Parked{" "}
            <time dateTime={idea.createdAt}>
              {new Date(idea.createdAt).toLocaleDateString()}
            </time>
          </p>
        </div>
        <div className="thinking-detail-tools">
          {!idea.archivedAt && (
            <IdeaEditor idea={idea} domains={options.domains} />
          )}
          <IdeaActions
            id={idea.id}
            version={idea.version}
            archived={Boolean(idea.archivedAt)}
          />
        </div>
      </header>

      {idea.archivedAt && (
        <p className="thinking-archive-notice">
          This idea is resting in the archive. Restore it to make or link new
          work from it.
        </p>
      )}

      {idea.notes ? (
        <p className="idea-detail-notes">{idea.notes}</p>
      ) : (
        <p className="idea-detail-notes idea-detail-notes--empty">
          No note was needed when this idea was captured.
        </p>
      )}

      {idea.domains.length > 0 && (
        <ul className="thinking-domain-tags" aria-label="Related domains">
          {idea.domains.map((domain) => (
            <li key={domain.id}>{domain.name}</li>
          ))}
        </ul>
      )}

      <Card className="idea-making" aria-labelledby="idea-making-title">
        <div>
          <p className="eyebrow">Make from this</p>
          <h3 id="idea-making-title">Give the thought a next life.</h3>
          <p>
            Creating something keeps this original idea intact. You can return
            and use it again.
          </p>
        </div>
        {!idea.archivedAt && (
          <IdeaPromote
            idea={idea}
            options={options}
            defaultStartOn={defaultStartOn}
          />
        )}
      </Card>

      <Card className="idea-outputs" aria-labelledby="idea-outputs-title">
        <header>
          <p className="eyebrow">Became</p>
          <h3 id="idea-outputs-title">
            {idea.outputsCount
              ? `Inspired ${idea.outputsCount} ${idea.outputsCount === 1 ? "thing" : "things"}`
              : "Still open"}
          </h3>
        </header>
        {idea.outputsCount ? (
          <ol>
            <ThinkingPagination
              key={`${idea.id}:outputs:${idea.outputsCount}:${idea.outputsNextCursor ?? "end"}`}
              kind="ideaOutputs"
              recordId={idea.id}
              initialItems={idea.outputs}
              initialCursor={idea.outputsNextCursor}
              moreLabel="Earlier outcomes"
              renderItem={(output) => (
                <li key={`${output.type}:${output.id}`}>
                  <time dateTime={output.linkedAt}>
                    {new Date(output.linkedAt).toLocaleDateString()}
                  </time>
                  <Link href={output.href}>
                    <span>{output.label}</span>
                    <small>
                      {output.type.toLowerCase()}
                      {output.archived ? " · Archived" : ""}
                    </small>
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </li>
              )}
            />
          </ol>
        ) : (
          <p>This idea has not become another record yet.</p>
        )}
      </Card>

      {idea.history.length > 0 && (
        <Card className="thinking-history" aria-labelledby="idea-history-title">
          <header>
            <p className="eyebrow">History</p>
            <h3 id="idea-history-title">The thread stays intact.</h3>
          </header>
          <ol>
            <ThinkingPagination
              key={`${idea.id}:history:${idea.version}:${idea.historyNextCursor ?? "end"}`}
              kind="idea"
              recordId={idea.id}
              initialItems={idea.history}
              initialCursor={idea.historyNextCursor}
              moreLabel="Earlier history"
              renderItem={(entry) => {
                const snapshot = ideaSnapshot(entry.snapshot);
                return (
                  <li key={entry.id}>
                    <div>
                      <span>
                        {historyLabels[entry.kind] ??
                          entry.kind.toLowerCase().replaceAll("_", " ")}
                      </span>
                      {snapshot && (
                        <details className="thinking-history-copy">
                          <summary>Read saved wording</summary>
                          {snapshot.title && <strong>{snapshot.title}</strong>}
                          {snapshot.notes && <p>{snapshot.notes}</p>}
                        </details>
                      )}
                    </div>
                    <time dateTime={entry.createdAt}>
                      {new Date(entry.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </li>
                );
              }}
            />
          </ol>
        </Card>
      )}
    </article>
  );
}
