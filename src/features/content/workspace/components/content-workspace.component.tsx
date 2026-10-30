"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  WorkspacePanel,
  WorkspaceLink,
} from "@/components/ui/workspace/workspace.component";
import { ArrowLeft, Link2, Plus } from "lucide-react";
import { confirmRecordFormDiscard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { ContentWritingEditor } from "@/features/content/editor/components/content-writing-editor.component";
import { ContentThumbnailEditor } from "@/features/content/media/components/content-thumbnail-editor.component";
import { ContentReleaseHistory } from "@/features/content/results/components/content-release-history.component";
import type { ContentWorkspace as ContentWorkspaceData } from "@/features/content/types/content.types";
import { ContentAddVersion } from "@/features/content/variants/components/content-add-version.component";
import { ContentIntentEditor } from "@/features/content/workspace/components/content-intent-editor.component";
import { ContentProgressRail } from "@/features/content/workspace/components/content-progress-rail.component";

function variantLabel(name: string, index: number) {
  return name.trim() || (index === 0 ? "First variant" : "Untitled variant");
}

export function ContentWorkspace({
  initialData,
  initialVariantId,
}: {
  initialData: ContentWorkspaceData;
  initialVariantId?: string;
}) {
  const [workspaceOverride, setWorkspaceOverride] =
    useState<ContentWorkspaceData | null>(null);
  const workspaceBase =
    workspaceOverride &&
    workspaceOverride.workspaceVersion > initialData.workspaceVersion
      ? workspaceOverride
      : initialData;
  const workspace = workspaceOverride
    ? {
        ...workspaceBase,
        recordedTime: initialData.recordedTime,
        sessions: initialData.sessions,
        sessionsNextCursor: initialData.sessionsNextCursor,
      }
    : initialData;
  const acceptWorkspace = useCallback(
    (next: ContentWorkspaceData) => {
      setWorkspaceOverride((current) => {
        const displayedVersion = Math.max(
          initialData.workspaceVersion,
          current?.workspaceVersion ?? 0,
        );
        return next.workspaceVersion >= displayedVersion ? next : current;
      });
    },
    [initialData.workspaceVersion],
  );
  const [selectedVariantId, setSelectedVariantId] = useState(
    initialData.variants.find((variant) => variant.id === initialVariantId)
      ?.id ??
      initialData.variants.find((variant) => !variant.archivedAt)?.id ??
      initialData.variants[0]?.id ??
      "",
  );
  const variant = useMemo(
    () =>
      workspace.variants.find((item) => item.id === selectedVariantId) ??
      workspace.variants[0],
    [selectedVariantId, workspace.variants],
  );

  if (!variant) return null;

  const links = [
    ...workspace.ideas,
    ...workspace.decisions,
    ...workspace.goals,
    ...workspace.experiments,
  ];

  return (
    <div className="page-shell content-workspace-shell">
      <header className="content-workspace-header">
        <WorkspaceLink href="/content" variant="ghost">
          <ArrowLeft aria-hidden="true" /> Back to Content
        </WorkspaceLink>
        <div className="content-workspace-heading">
          <div>
            <p className="eyebrow">Creative work</p>
            <h1 className="content-workspace-title">Your next piece.</h1>
            <p>Your brief, the version you are making, and its next step.</p>
          </div>
          <ContentThumbnailEditor
            contentId={workspace.id}
            variant={variant}
            contentTitle={workspace.title}
            variantLabel={variantLabel(
              variant.name,
              Math.max(
                0,
                workspace.variants.findIndex((item) => item.id === variant.id),
              ),
            )}
            readOnly={Boolean(workspace.archivedAt || variant.archivedAt)}
            onWorkspace={acceptWorkspace}
          />
        </div>
      </header>

      <div className="content-workspace-body">
        <WorkspacePanel className="content-brief-card">
          <ContentIntentEditor
            key={workspace.id}
            workspace={workspace}
            onWorkspace={acceptWorkspace}
          />
        </WorkspacePanel>

        <nav className="content-versions" aria-label="Content variants">
          <div className="content-version-tabs">
            {workspace.variants.map((item, index) => (
              <button
                type="button"
                key={item.id}
                aria-current={item.id === variant.id ? "page" : undefined}
                onClick={() => {
                  if (
                    item.id !== variant.id &&
                    confirmRecordFormDiscard(
                      document.querySelector(".content-making-layout") ??
                        undefined,
                    )
                  ) {
                    setSelectedVariantId(item.id);
                  }
                }}
              >
                <span>{variantLabel(item.name, index)}</span>
                <small>{item.stageLabel}</small>
              </button>
            ))}
          </div>
          <ContentAddVersion
            contentId={workspace.id}
            onCreated={(next, variantId) => {
              acceptWorkspace(next);
              if (
                variantId &&
                confirmRecordFormDiscard(
                  document.querySelector(".content-making-layout") ?? undefined,
                )
              )
                setSelectedVariantId(variantId);
            }}
          />
        </nav>

        <div
          className="content-making-layout"
          key={`${workspace.id}:${variant.id}`}
        >
          <ContentWritingEditor
            contentId={workspace.id}
            variant={variant}
            onWorkspace={acceptWorkspace}
          />
          <ContentProgressRail
            workspace={workspace}
            variant={variant}
            onWorkspace={acceptWorkspace}
          />
        </div>
      </div>

      <aside className="content-related" aria-label="Related records">
        <span>
          <Link2 aria-hidden="true" /> Connected to
        </span>
        {links.length > 0 && (
          <ul>
            {links.map((link) => (
              <li key={`${link.href}:${link.id}`}>
                <Link href={link.href}>
                  {link.label}
                  {link.archived ? " · Archived" : ""}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`/direction/decisions/new?contentId=${workspace.id}`}
          className="content-related-action"
        >
          <Plus aria-hidden="true" /> Record why
        </Link>
      </aside>

      <ContentReleaseHistory
        workspace={workspace}
        variant={variant}
        onWorkspace={acceptWorkspace}
      />
    </div>
  );
}
