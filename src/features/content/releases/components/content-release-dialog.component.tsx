"use client";

import { Fragment, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, Plus } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useRecordFormGuard } from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import { Select } from "@/components/ui/forms/select.component";
import {
  RecordDialog,
  useRecordDialogClose,
} from "@/components/ui/forms/record-dialog.component";
import { sendContentCommand } from "@/features/content/commands/utils/content-command.util";
import { useContentOperation } from "@/features/content/commands/hooks/use-content-operation.hook";
import type {
  ChannelDraft,
  ChannelPlatform,
  ChannelView,
  ContentWorkspace,
  PublicationDraft,
  VariantView,
} from "@/features/content/types/content.types";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

function localDate() {
  return DateTime.now().setZone(APP_TIMEZONE).toISODate() ?? "";
}

const platformOptions = [
  { value: "YOUTUBE", label: "YouTube" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "OTHER", label: "Another platform" },
] satisfies { value: ChannelPlatform; label: string }[];

type ChannelReleaseDraft = { url: string; placement: string };

function ContentReleaseForm({
  workspace,
  variant,
  onWorkspace,
}: {
  workspace: ContentWorkspace;
  variant: VariantView;
  onWorkspace: (workspace: ContentWorkspace) => void;
}) {
  const close = useRecordDialogClose();
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useRecordFormGuard(formRef);
  const run = useContentOperation();
  const [channels, setChannels] = useState(workspace.channels);
  const [selected, setSelected] = useState<Record<string, ChannelReleaseDraft>>(
    {},
  );
  const [publishedTitle, setPublishedTitle] = useState(workspace.title);
  const [publishedOn, setPublishedOn] = useState(localDate);
  const [publishedTime, setPublishedTime] = useState("");
  const [addingChannel, setAddingChannel] = useState(channels.length === 0);
  const [channelDraft, setChannelDraft] = useState<ChannelDraft>({
    name: "",
    platform: "YOUTUBE",
    account: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingRelease, setExistingRelease] = useState<{
    href: string;
    title: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const selectedChannels = useMemo(
    () => channels.filter((channel) => selected[channel.id]),
    [channels, selected],
  );

  function toggleChannel(channel: ChannelView) {
    setSelected((current) => {
      const next = { ...current };
      if (next[channel.id]) delete next[channel.id];
      else next[channel.id] = { url: "", placement: "" };
      return next;
    });
  }

  async function saveChannel() {
    if (pending) return;
    setPending(true);
    setError(null);
    setExistingRelease(null);
    const result = await run(channelDraft, (operationKey) =>
      sendContentCommand({
        type: "SAVE_CHANNEL",
        operationKey,
        draft: channelDraft,
      }),
    );
    setPending(false);
    if (result.error) return setError(result.error);
    const nextChannels = result.channels ?? result.workspace?.channels;
    if (!nextChannels)
      return setError("The channel was saved, but could not be shown yet.");
    setChannels(nextChannels);
    const created = nextChannels.find((channel) => channel.id === result.id);
    if (created) toggleChannel(created);
    setAddingChannel(false);
    setChannelDraft({ name: "", platform: "YOUTUBE", account: "" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || selectedChannels.length === 0) return;
    setPending(true);
    setError(null);
    setExistingRelease(null);
    setFieldErrors({});
    const publishedAt = publishedTime
      ? DateTime.fromISO(`${publishedOn}T${publishedTime}`, {
          zone: APP_TIMEZONE,
        }).toISO()
      : null;
    const publications: PublicationDraft[] = selectedChannels.map(
      (channel) => ({
        channelId: channel.id,
        publishedTitle,
        publishedOn,
        publishedAt,
        url: selected[channel.id]?.url ?? "",
        placement: selected[channel.id]?.placement ?? "",
      }),
    );
    const identity = {
      contentId: workspace.id,
      variantId: variant.id,
      publications,
    };
    const result = await run(identity, (operationKey) =>
      sendContentCommand({
        type: "PUBLISH",
        operationKey,
        contentId: workspace.id,
        variantId: variant.id,
        publications,
      }),
    );
    setPending(false);
    if (result.error || !result.workspace) {
      if (result.existingRelease) {
        setExistingRelease({
          href: result.existingRelease.href,
          title: result.existingRelease.title,
        });
      }
      setError(
        result.error ??
          "The releases were saved, but the workspace could not refresh.",
      );
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    markSaved();
    onWorkspace(result.workspace);
    close?.();
  }

  return (
    <form ref={formRef} className="content-dialog-form" onSubmit={submit}>
      <fieldset className="content-release-channels">
        <legend>Where did this version go?</legend>
        {channels
          .filter((channel) => !channel.archivedAt)
          .map((channel) => {
            const checked = Boolean(selected[channel.id]);
            return (
              <Fragment key={channel.id}>
                <button
                  type="button"
                  className="content-channel-choice"
                  aria-pressed={checked}
                  onClick={() => toggleChannel(channel)}
                >
                  <span className="content-channel-mark" aria-hidden="true">
                    {checked && <Check />}
                  </span>
                  <span>
                    <strong>{channel.displayName}</strong>
                    <small>{channel.platformName}</small>
                  </span>
                </button>
                {checked && (
                  <input type="hidden" name="channelIds" value={channel.id} />
                )}
              </Fragment>
            );
          })}
        <button
          type="button"
          className="content-add-channel-trigger"
          onClick={() => setAddingChannel((current) => !current)}
          aria-expanded={addingChannel}
        >
          <Plus aria-hidden="true" /> Add a channel or account
        </button>
      </fieldset>

      {addingChannel && (
        <fieldset className="content-add-channel">
          <legend>New channel or account</legend>
          <div className="content-form-field">
            <span>Platform</span>
            <Select
              label="Platform"
              name="channelPlatform"
              value={channelDraft.platform}
              options={platformOptions}
              onValueChange={(platform) =>
                setChannelDraft({
                  ...channelDraft,
                  platform,
                  platformLabel:
                    platform === "OTHER"
                      ? channelDraft.platformLabel
                      : undefined,
                })
              }
            />
          </div>
          {channelDraft.platform === "OTHER" && (
            <label className="content-form-field">
              <span>Platform name</span>
              <input
                name="platformLabel"
                value={channelDraft.platformLabel ?? ""}
                onChange={(event) =>
                  setChannelDraft({
                    ...channelDraft,
                    platformLabel: event.target.value,
                  })
                }
                placeholder="Podcast app, newsletter…"
                maxLength={80}
                required
              />
            </label>
          )}
          <label className="content-form-field">
            <span>Channel name</span>
            <input
              name="channelName"
              value={channelDraft.name}
              onChange={(event) =>
                setChannelDraft({ ...channelDraft, name: event.target.value })
              }
              placeholder="Main channel"
              maxLength={120}
            />
          </label>
          <label className="content-form-field content-form-field--wide">
            <span>Account or handle</span>
            <input
              name="channelAccount"
              value={channelDraft.account}
              onChange={(event) =>
                setChannelDraft({
                  ...channelDraft,
                  account: event.target.value,
                })
              }
              placeholder="@yourhandle"
              maxLength={160}
            />
          </label>
          <button
            type="button"
            className="content-secondary-action"
            onClick={saveChannel}
            disabled={pending || !channelDraft.name.trim()}
          >
            Save channel
          </button>
        </fieldset>
      )}

      {selectedChannels.length > 0 && (
        <>
          <div className="content-release-common">
            <label className="content-form-field content-form-field--wide">
              <span>Published title</span>
              <input
                name="publishedTitle"
                value={publishedTitle}
                onChange={(event) => setPublishedTitle(event.target.value)}
                placeholder="The title people saw"
                maxLength={240}
                required
              />
            </label>
            <label className="content-form-field">
              <span>Release date</span>
              <input
                type="date"
                name="publishedOn"
                value={publishedOn}
                onChange={(event) => setPublishedOn(event.target.value)}
                required
              />
            </label>
            <label className="content-form-field">
              <span>
                Time in Amsterdam <small>Optional</small>
              </span>
              <input
                type="time"
                name="publishedTime"
                value={publishedTime}
                onChange={(event) => setPublishedTime(event.target.value)}
              />
            </label>
          </div>
          <ol className="content-release-destinations">
            {selectedChannels.map((channel) => (
              <li key={channel.id}>
                <header>
                  <strong>{channel.displayName}</strong>
                  <span>{channel.platformName}</span>
                </header>
                <label className="content-form-field">
                  <span>
                    Public URL <small>Optional</small>
                  </span>
                  <input
                    type="url"
                    name={`releaseUrl:${channel.id}`}
                    value={selected[channel.id]?.url ?? ""}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        [channel.id]: {
                          ...current[channel.id],
                          url: event.target.value,
                        },
                      }))
                    }
                    placeholder="https://…"
                    aria-invalid={
                      Boolean(fieldErrors[`publications.${channel.id}.url`]) ||
                      undefined
                    }
                  />
                </label>
                <label className="content-form-field">
                  <span>
                    Placement <small>Optional</small>
                  </span>
                  <input
                    name={`releasePlacement:${channel.id}`}
                    value={selected[channel.id]?.placement ?? ""}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        [channel.id]: {
                          ...current[channel.id],
                          placement: event.target.value,
                        },
                      }))
                    }
                    placeholder="Shorts, Reels, feed…"
                    maxLength={80}
                  />
                </label>
              </li>
            ))}
          </ol>
        </>
      )}

      {error && (
        <p className="content-form-error" role="alert">
          {error}
        </p>
      )}
      {existingRelease && (
        <p className="content-release-existing" role="status">
          This destination is already recorded. Open{" "}
          <Link href={existingRelease.href}>{existingRelease.title}</Link> to
          review or correct it.
        </p>
      )}
      {Object.keys(fieldErrors).length > 0 && (
        <ul className="content-form-error" role="alert">
          {Object.entries(fieldErrors).map(([key, message]) => (
            <li key={key}>{message}</li>
          ))}
        </ul>
      )}
      <footer className="content-dialog-actions">
        <button
          type="submit"
          className="content-primary-action"
          disabled={
            pending ||
            selectedChannels.length === 0 ||
            !publishedOn ||
            !publishedTitle.trim()
          }
        >
          {pending
            ? "Recording…"
            : `Record ${selectedChannels.length === 1 ? "release" : `${selectedChannels.length} releases`}`}
        </button>
      </footer>
    </form>
  );
}

export function ContentReleaseDialog(props: {
  workspace: ContentWorkspace;
  variant: VariantView;
  onWorkspace: (workspace: ContentWorkspace) => void;
}) {
  return (
    <RecordDialog
      eyebrow="Release this version"
      triggerLabel="Record a release"
      title="Where did it go?"
      description="Choose every channel that received this same version. Each release can collect its own results."
      unstyledTrigger
      className="content-primary-action"
      icon={false}
    >
      <ContentReleaseForm {...props} />
    </RecordDialog>
  );
}
