"use client";

import {
  Check,
  ImagePlus,
  Pencil,
  Quote,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  FormEvent,
  type FormEventHandler,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/buttons/button.component";
import {
  confirmRecordFormDiscard,
  useRecordFormGuard,
} from "@/components/ui/forms/hooks/use-record-form-guard.hook";
import {
  sendDirectionCommand,
  type DirectionClientResult,
  type SeasonMediaDraft,
  type SeasonQuoteDraft,
} from "@/features/direction/commands/utils/direction-command-client.util";
import { useStableOperation } from "@/features/direction/commands/hooks/use-stable-operation.hook";
import {
  manualProvenance,
  uploadSeasonMedia,
} from "@/features/seasons/media/utils/season-media-client.util";
import type {
  SeasonMediaView,
  SeasonQuoteView,
  SeasonView,
} from "@/features/seasons/types/season.types";

type EditorMode = "image" | "quote" | null;

function GuardedInspirationForm({
  children,
  onSubmit,
  onCancel,
}: {
  children: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  useRecordFormGuard(ref);
  return (
    <form
      ref={ref}
      className="season-inspiration-form"
      onSubmit={onSubmit}
      onReset={(event) => {
        event.preventDefault();
        if (confirmRecordFormDiscard(ref.current ?? undefined)) onCancel();
      }}
    >
      {children}
    </form>
  );
}

function mediaDraft(data: FormData): SeasonMediaDraft {
  return {
    alt: String(data.get("alt") ?? ""),
    decorative: data.get("decorative") === "on",
    focalX: Number(data.get("focalX") ?? 50) / 100,
    focalY: Number(data.get("focalY") ?? 50) / 100,
    poster: data.get("poster") === "on",
    provenance: {
      sourceUrl: String(data.get("sourceUrl") ?? ""),
      sourceTitle: String(data.get("sourceTitle") ?? ""),
      credit: String(data.get("credit") ?? ""),
      attributionVerified: data.get("attributionVerified") === "on",
    },
  };
}

function quoteDraft(data: FormData): SeasonQuoteDraft {
  return {
    text: String(data.get("text") ?? ""),
    attribution: String(data.get("attribution") ?? ""),
    kind: String(data.get("kind") ?? "UNKNOWN") as SeasonQuoteDraft["kind"],
    featured: data.get("featured") === "on",
    provenance: {
      sourceUrl: String(data.get("sourceUrl") ?? ""),
      sourceTitle: String(data.get("sourceTitle") ?? ""),
      credit: String(data.get("credit") ?? ""),
      attributionVerified: data.get("attributionVerified") === "on",
    },
  };
}

async function fileFingerprint(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function SeasonInspirationEditor({ season }: { season: SeasonView }) {
  const router = useRouter();
  const versionRef = useRef(season.version);
  const [mode, setMode] = useState<EditorMode>(null);
  const [editingMedia, setEditingMedia] = useState<SeasonMediaView | null>(
    null,
  );
  const [editingQuote, setEditingQuote] = useState<SeasonQuoteView | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [decorative, setDecorative] = useState(false);
  const [quoteKind, setQuoteKind] =
    useState<SeasonQuoteDraft["kind"]>("UNKNOWN");
  const runStable = useStableOperation();

  useEffect(() => {
    versionRef.current = season.version;
  }, [season.version]);

  function openImage(item?: SeasonMediaView) {
    setEditingMedia(item ?? null);
    setDecorative(item?.decorative ?? false);
    setEditingQuote(null);
    setMode("image");
    setError(null);
    setFieldErrors({});
  }

  function openQuote(item?: SeasonQuoteView) {
    setEditingQuote(item ?? null);
    setQuoteKind(item?.kind ?? "UNKNOWN");
    setEditingMedia(null);
    setMode("quote");
    setError(null);
    setFieldErrors({});
  }

  function acceptResult(result: DirectionClientResult) {
    setPending(false);
    setError(result.recoveredPrevious ? null : result.error);
    setFieldErrors(result.fieldErrors ?? {});
    if (result.version !== undefined) versionRef.current = result.version;
    if (!result.error || result.recoveredPrevious) {
      setMode(null);
      setEditingMedia(null);
      setEditingQuote(null);
      router.refresh();
    }
  }

  async function saveImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const draft = mediaDraft(data);
    if (editingMedia) {
      const identity = {
        type: "SAVE_SEASON_MEDIA" as const,
        year: season.year,
        quarter: season.quarter,
        expectedVersion: versionRef.current,
        mediaId: editingMedia.id,
        draft,
      };
      acceptResult(
        await runStable(identity, (operationKey) =>
          sendDirectionCommand({ ...identity, operationKey }),
        ),
      );
      return;
    }
    const file = data.get("file");
    if (!(file instanceof File) || !file.size) {
      setPending(false);
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    let contentFingerprint: string;
    try {
      contentFingerprint = await fileFingerprint(file);
    } catch {
      setPending(false);
      setError("Become could not prepare this image. Choose the file again.");
      return;
    }
    const identity = {
      type: "UPLOAD_SEASON_MEDIA",
      year: season.year,
      quarter: season.quarter,
      expectedVersion: versionRef.current,
      draft,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        contentFingerprint,
      },
    };
    acceptResult(
      await runStable(identity, (operationKey) =>
        uploadSeasonMedia({
          year: identity.year,
          quarter: identity.quarter,
          expectedVersion: identity.expectedVersion,
          operationKey,
          draft,
          file,
        }),
      ),
    );
  }

  async function saveQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const draft = quoteDraft(new FormData(event.currentTarget));
    const identity = {
      type: "SAVE_SEASON_QUOTE" as const,
      year: season.year,
      quarter: season.quarter,
      expectedVersion: versionRef.current,
      quoteId: editingQuote?.id,
      draft,
    };
    acceptResult(
      await runStable(identity, (operationKey) =>
        sendDirectionCommand({ ...identity, operationKey }),
      ),
    );
  }

  async function retire(kind: "image" | "quote", id: string) {
    setPending(true);
    setError(null);
    if (kind === "image") {
      const identity = {
        type: "SAVE_SEASON_MEDIA" as const,
        year: season.year,
        quarter: season.quarter,
        expectedVersion: versionRef.current,
        mediaId: id,
        retire: true as const,
      };
      acceptResult(
        await runStable(identity, (operationKey) =>
          sendDirectionCommand({ ...identity, operationKey }),
        ),
      );
      return;
    }
    const identity = {
      type: "SAVE_SEASON_QUOTE" as const,
      year: season.year,
      quarter: season.quarter,
      expectedVersion: versionRef.current,
      quoteId: id,
      retire: true as const,
    };
    acceptResult(
      await runStable(identity, (operationKey) =>
        sendDirectionCommand({ ...identity, operationKey }),
      ),
    );
  }

  const imageProvenance = manualProvenance(editingMedia?.provenance);
  const quoteProvenance = manualProvenance(editingQuote?.provenance);

  return (
    <section
      className="season-inspiration"
      aria-labelledby="season-inspiration-title"
    >
      <header>
        <div>
          <p className="eyebrow">Make it personal</p>
          <h2 id="season-inspiration-title">
            Imagery and words for this chapter
          </h2>
          <p>
            Keep one poster, up to two alternate images, and a small set of
            quotes you can source honestly.
          </p>
        </div>
        <div>
          <Button
            type="button"
            variant="secondary"
            disabled={pending || mode !== null || season.media.length >= 3}
            onClick={() => openImage()}
          >
            <ImagePlus aria-hidden="true" /> Add image
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending || mode !== null || season.quotes.length >= 12}
            onClick={() => openQuote()}
          >
            <Quote aria-hidden="true" /> Add quote
          </Button>
        </div>
      </header>

      {(season.media.length > 0 || season.quotes.length > 0) && (
        <div className="season-inspiration-library">
          {season.media.map((item) => (
            <article className="season-media-thumb" key={item.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.href}
                alt={item.decorative ? "" : item.alt}
                width={item.width}
                height={item.height}
                style={{
                  objectPosition: `${item.focalX * 100}% ${item.focalY * 100}%`,
                }}
              />
              <div>
                <strong>
                  {item.poster ? (
                    <>
                      <Star aria-hidden="true" /> Poster
                    </>
                  ) : (
                    "Alternate"
                  )}
                </strong>
                <small>
                  {item.provenance.credit || item.alt || "Decorative image"}
                </small>
              </div>
              <button
                type="button"
                aria-label="Edit image details"
                disabled={pending || mode !== null}
                onClick={() => openImage(item)}
              >
                <Pencil aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Retire image"
                disabled={pending || mode !== null}
                onClick={() => void retire("image", item.id)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </article>
          ))}
          {season.quotes.map((item) => (
            <article className="season-quote-row" key={item.id}>
              <Quote aria-hidden="true" />
              <div>
                <blockquote>“{item.text}”</blockquote>
                <small>
                  {item.attribution || "Attribution unknown"} ·{" "}
                  {item.kind.toLowerCase()}
                </small>
              </div>
              {item.featured && (
                <span>
                  <Star aria-hidden="true" /> Featured
                </span>
              )}
              <button
                type="button"
                aria-label="Edit quote"
                disabled={pending || mode !== null}
                onClick={() => openQuote(item)}
              >
                <Pencil aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Retire quote"
                disabled={pending || mode !== null}
                onClick={() => void retire("quote", item.id)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      )}

      {mode === "image" && (
        <GuardedInspirationForm
          onSubmit={saveImage}
          onCancel={() => setMode(null)}
        >
          <div className="season-inspiration-form-heading">
            <div>
              <p className="eyebrow">
                {editingMedia ? "Image details" : "Private upload"}
              </p>
              <h3>
                {editingMedia
                  ? "Refine how this image belongs."
                  : "Add one purposeful image."}
              </h3>
            </div>
            <button type="reset" aria-label="Close image editor">
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="direction-form-grid">
            {!editingMedia && (
              <label className="direction-field-wide">
                <span className="field-label">Image</span>
                <input
                  className="season-file-input"
                  type="file"
                  name="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                />
                <small>
                  JPEG, PNG, or WebP · up to 6 MB and 12 megapixels. Become
                  stores a private normalized copy.
                </small>
              </label>
            )}
            <label className="direction-field-wide">
              <span className="field-label">Alternative text</span>
              <textarea
                className="text-input text-input--textarea-sm"
                name="alt"
                defaultValue={editingMedia?.alt ?? ""}
                maxLength={1000}
                required={!decorative}
                disabled={decorative}
                aria-invalid={Boolean(fieldErrors.alt) || undefined}
              />
            </label>
            <label className="season-check-field">
              <input
                type="checkbox"
                name="decorative"
                checked={decorative}
                onChange={(event) => setDecorative(event.target.checked)}
              />
              <span>Decorative image; hide it from assistive technology</span>
            </label>
            <label className="season-check-field">
              <input
                type="checkbox"
                name="poster"
                defaultChecked={
                  editingMedia?.poster ?? season.media.length === 0
                }
              />
              <span>Use as the season poster</span>
            </label>
            <label>
              <span className="field-label">Horizontal focus</span>
              <input
                className="season-range"
                type="range"
                name="focalX"
                min="0"
                max="100"
                defaultValue={(editingMedia?.focalX ?? 0.5) * 100}
                aria-label="Horizontal focal position"
              />
            </label>
            <label>
              <span className="field-label">Vertical focus</span>
              <input
                className="season-range"
                type="range"
                name="focalY"
                min="0"
                max="100"
                defaultValue={(editingMedia?.focalY ?? 0.5) * 100}
                aria-label="Vertical focal position"
              />
            </label>
            <label>
              <span className="field-label">
                Credit <span>— optional</span>
              </span>
              <input
                className="text-input"
                name="credit"
                defaultValue={imageProvenance.credit}
                maxLength={500}
              />
            </label>
            <label>
              <span className="field-label">
                Source title <span>— optional</span>
              </span>
              <input
                className="text-input"
                name="sourceTitle"
                defaultValue={imageProvenance.sourceTitle}
                maxLength={300}
              />
            </label>
            <label className="direction-field-wide">
              <span className="field-label">
                Source URL <span>— credit only; Become never fetches it</span>
              </span>
              <input
                className="text-input"
                type="url"
                name="sourceUrl"
                defaultValue={imageProvenance.sourceUrl}
                maxLength={2000}
              />
            </label>
            <label className="season-check-field direction-field-wide">
              <input
                type="checkbox"
                name="attributionVerified"
                defaultChecked={imageProvenance.attributionVerified}
              />
              <span>I checked this credit and source.</span>
            </label>
          </div>
          {error && (
            <p className="season-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="season-inspiration-form-actions">
            <Button type="reset" variant="ghost" disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              <Save aria-hidden="true" />{" "}
              {pending
                ? "Saving…"
                : editingMedia
                  ? "Save image details"
                  : "Upload image"}
            </Button>
          </div>
        </GuardedInspirationForm>
      )}

      {mode === "quote" && (
        <GuardedInspirationForm
          onSubmit={saveQuote}
          onCancel={() => setMode(null)}
        >
          <div className="season-inspiration-form-heading">
            <div>
              <p className="eyebrow">Words to return to</p>
              <h3>
                {editingQuote
                  ? "Refine the quote record."
                  : "Add a quote without blurring its source."}
              </h3>
            </div>
            <button type="reset" aria-label="Close quote editor">
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="direction-form-grid">
            <label className="direction-field-wide">
              <span className="field-label">Quote or paraphrase</span>
              <textarea
                className="text-input text-input--textarea-sm"
                name="text"
                defaultValue={editingQuote?.text ?? ""}
                maxLength={2000}
                required
              />
            </label>
            <label>
              <span className="field-label">Source status</span>
              <span className="select-wrap">
                <select
                  name="kind"
                  value={quoteKind}
                  onChange={(event) =>
                    setQuoteKind(event.target.value as SeasonQuoteDraft["kind"])
                  }
                >
                  <option value="UNKNOWN">Attribution unknown</option>
                  <option value="PARAPHRASE">Paraphrase</option>
                  <option value="EXACT">Exact quote</option>
                </select>
              </span>
            </label>
            <label>
              <span className="field-label">
                Attribution {quoteKind !== "EXACT" && <span>— optional</span>}
              </span>
              <input
                className="text-input"
                name="attribution"
                defaultValue={editingQuote?.attribution ?? ""}
                maxLength={300}
                required={quoteKind === "EXACT"}
              />
            </label>
            <label>
              <span className="field-label">
                Source title <span>— optional</span>
              </span>
              <input
                className="text-input"
                name="sourceTitle"
                defaultValue={quoteProvenance.sourceTitle}
                maxLength={300}
              />
            </label>
            <label>
              <span className="field-label">
                Credit <span>— optional</span>
              </span>
              <input
                className="text-input"
                name="credit"
                defaultValue={quoteProvenance.credit}
                maxLength={500}
              />
            </label>
            <label className="direction-field-wide">
              <span className="field-label">
                Source URL {quoteKind !== "EXACT" && <span>— optional</span>}
              </span>
              <input
                className="text-input"
                type="url"
                name="sourceUrl"
                defaultValue={quoteProvenance.sourceUrl}
                maxLength={2000}
                required={quoteKind === "EXACT"}
              />
            </label>
            <label className="season-check-field">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={
                  editingQuote?.featured ?? season.quotes.length === 0
                }
              />
              <span>Feature on the poster</span>
            </label>
            <label className="season-check-field">
              <input
                type="checkbox"
                name="attributionVerified"
                defaultChecked={quoteProvenance.attributionVerified}
                required={quoteKind === "EXACT"}
              />
              <span>
                {quoteKind === "EXACT"
                  ? "I verified the exact wording and attribution."
                  : "I checked this source."}
              </span>
            </label>
          </div>
          {quoteKind === "EXACT" && (
            <p className="direction-field-hint">
              <Check aria-hidden="true" /> Exact quotes need an attribution,
              source URL, and your verification. Choose paraphrase or unknown if
              any part is uncertain.
            </p>
          )}
          {error && (
            <p className="season-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="season-inspiration-form-actions">
            <Button type="reset" variant="ghost" disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              <Save aria-hidden="true" /> {pending ? "Saving…" : "Save quote"}
            </Button>
          </div>
        </GuardedInspirationForm>
      )}
    </section>
  );
}
