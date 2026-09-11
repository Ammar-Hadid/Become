"use client";

import { ImagePlus, Quote, Save, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import type {
  SeasonMediaDraft,
  SeasonQuoteDraft,
} from "@/features/direction/commands/utils/direction-command-client.util";
import {
  SEASON_IMAGE_ACCEPT,
  SEASON_IMAGE_FORMAT_LABEL,
} from "@/features/seasons/media/constants/season-image.constants";

type ManualMode = "image" | "text" | null;

export function CotsManualEntry({
  disabled,
  kind,
  onAddImage,
  onAddText,
}: {
  disabled: boolean;
  kind: Exclude<ManualMode, null>;
  onAddImage: (
    file: File,
    draft: SeasonMediaDraft,
    operationKey: string,
  ) => Promise<boolean>;
  onAddText: (
    draft: SeasonQuoteDraft,
    operationKey: string,
  ) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<ManualMode>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [decorative, setDecorative] = useState(false);
  const [quoteKind, setQuoteKind] =
    useState<SeasonQuoteDraft["kind"]>("UNKNOWN");
  const rootRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const operationKey = useRef<string | null>(null);

  const open = (next: Exclude<ManualMode, null>) => {
    operationKey.current = crypto.randomUUID();
    setLocalError(null);
    setMode(next);
  };

  const close = () => {
    operationKey.current = null;
    setLocalError(null);
    setMode(null);
  };

  async function saveImage() {
    const root = rootRef.current;
    const file = fileRef.current?.files?.[0];
    if (!root || !file) {
      setLocalError(`Choose a ${SEASON_IMAGE_FORMAT_LABEL} image.`);
      return;
    }
    const value = (name: string) =>
      root.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value ?? "";
    const alt = value("alt").trim();
    if (!decorative && !alt) {
      setLocalError("Describe the image, or mark it decorative.");
      return;
    }
    const saved = await onAddImage(
      file,
      {
        alt,
        decorative,
        focalX: 0.5,
        focalY: 0.5,
        poster:
          root.querySelector<HTMLInputElement>('[name="poster"]')?.checked ??
          false,
        provenance: {
          sourceUrl: value("sourceUrl").trim(),
          sourceTitle: value("sourceTitle").trim(),
          credit: value("credit").trim(),
          attributionVerified:
            root.querySelector<HTMLInputElement>('[name="attributionVerified"]')
              ?.checked ?? false,
        },
      },
      operationKey.current ?? (operationKey.current = crypto.randomUUID()),
    );
    if (saved) close();
  }

  async function saveText() {
    const root = rootRef.current;
    if (!root) return;
    const value = (name: string) =>
      root.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[name="${name}"]`,
      )?.value ?? "";
    const text = value("text").trim();
    const attribution = value("attribution").trim();
    const sourceTitle = value("sourceTitle").trim();
    const sourceUrl = value("sourceUrl").trim();
    if (!text) {
      setLocalError("Add the words you want to keep.");
      return;
    }
    if (quoteKind === "EXACT" && !attribution) {
      setLocalError("An exact quote needs an attribution.");
      return;
    }
    if (quoteKind === "EXACT" && !sourceTitle && !sourceUrl) {
      setLocalError("Add a source title, edition, episode, interview, or URL.");
      return;
    }
    const saved = await onAddText(
      {
        text,
        attribution,
        kind: quoteKind,
        featured:
          root.querySelector<HTMLInputElement>('[name="featured"]')?.checked ??
          false,
        provenance: {
          sourceUrl,
          sourceTitle,
          credit: value("credit").trim(),
          attributionVerified:
            root.querySelector<HTMLInputElement>('[name="attributionVerified"]')
              ?.checked ?? false,
        },
      },
      operationKey.current ?? (operationKey.current = crypto.randomUUID()),
    );
    if (saved) close();
  }

  if (!mode) {
    return (
      <div className="cots-manual-actions">
        {kind === "image" ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => open("image")}
          >
            <ImagePlus aria-hidden="true" /> Add your own image
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => open("text")}
          >
            <Quote aria-hidden="true" /> Add words manually
          </button>
        )}
      </div>
    );
  }

  return (
    <section
      ref={rootRef}
      className="cots-manual-entry"
      data-cots-manual={mode}
      aria-labelledby={`cots-manual-${mode}-title`}
    >
      <header>
        <div>
          <p className="eyebrow">
            {mode === "image" ? "Private upload" : "Words to return to"}
          </p>
          <h3 id={`cots-manual-${mode}-title`}>
            {mode === "image"
              ? "Add one purposeful image."
              : "Keep the wording and its source together."}
          </h3>
        </div>
        <button type="button" aria-label="Close manual entry" onClick={close}>
          <X aria-hidden="true" />
        </button>
      </header>

      {mode === "image" ? (
        <div className="direction-form-grid">
          <label className="direction-field-wide">
            <span className="field-label">Image</span>
            <input
              ref={fileRef}
              className="season-file-input"
              type="file"
              accept={SEASON_IMAGE_ACCEPT}
            />
            <small>
              {SEASON_IMAGE_FORMAT_LABEL} · up to 6 MB and 12 megapixels. Become
              stores a private normalized copy.
            </small>
          </label>
          <label className="direction-field-wide">
            <span className="field-label">Alternative text</span>
            <textarea
              className="text-input text-input--textarea-sm"
              name="alt"
              maxLength={1000}
              disabled={decorative}
            />
          </label>
          <label className="season-check-field">
            <input
              type="checkbox"
              checked={decorative}
              onChange={(event) => setDecorative(event.target.checked)}
            />
            <span>Decorative image; hide it from assistive technology</span>
          </label>
          <label className="season-check-field">
            <input type="checkbox" name="poster" />
            <span>Use as the season poster</span>
          </label>
          <label>
            <span className="field-label">
              Credit <span>— optional</span>
            </span>
            <input className="text-input" name="credit" maxLength={500} />
          </label>
          <label>
            <span className="field-label">
              Source title <span>— optional</span>
            </span>
            <input className="text-input" name="sourceTitle" maxLength={300} />
          </label>
          <label className="direction-field-wide">
            <span className="field-label">
              Source URL <span>— optional; Become never fetches it</span>
            </span>
            <input
              className="text-input"
              type="url"
              name="sourceUrl"
              maxLength={2000}
            />
          </label>
          <label className="season-check-field direction-field-wide">
            <input type="checkbox" name="attributionVerified" />
            <span>I checked this credit and source.</span>
          </label>
        </div>
      ) : (
        <div className="direction-form-grid">
          <label className="direction-field-wide">
            <span className="field-label">Quote or paraphrase</span>
            <textarea
              className="text-input text-input--textarea-sm"
              name="text"
              maxLength={2000}
            />
          </label>
          <label>
            <span className="field-label">Wording</span>
            <span className="select-wrap">
              <select
                value={quoteKind}
                onChange={(event) =>
                  setQuoteKind(event.target.value as SeasonQuoteDraft["kind"])
                }
              >
                <option value="UNKNOWN">Uncertain wording</option>
                <option value="PARAPHRASE">Paraphrase</option>
                <option value="EXACT">Exact quote</option>
              </select>
            </span>
          </label>
          <label>
            <span className="field-label">
              Attribution {quoteKind !== "EXACT" && <span>— optional</span>}
            </span>
            <input className="text-input" name="attribution" maxLength={300} />
          </label>
          <label>
            <span className="field-label">
              Source title or detail <span>— optional</span>
            </span>
            <input
              className="text-input"
              name="sourceTitle"
              maxLength={300}
              placeholder="Episode, edition, chapter, interview…"
            />
          </label>
          <label>
            <span className="field-label">
              Credit <span>— optional</span>
            </span>
            <input className="text-input" name="credit" maxLength={500} />
          </label>
          <label className="direction-field-wide">
            <span className="field-label">
              Source URL <span>— optional</span>
            </span>
            <input
              className="text-input"
              type="url"
              name="sourceUrl"
              maxLength={2000}
            />
          </label>
          <label className="season-check-field">
            <input type="checkbox" name="featured" />
            <span>Feature on the poster</span>
          </label>
          <label className="season-check-field">
            <input type="checkbox" name="attributionVerified" />
            <span>I checked this wording and source.</span>
          </label>
          {quoteKind === "EXACT" && (
            <p className="direction-field-hint direction-field-wide">
              Exact wording needs an attribution plus a source title/detail or
              URL. A printed edition, episode, or interview is valid evidence.
            </p>
          )}
        </div>
      )}

      {localError && (
        <p className="cots-error" role="alert">
          {localError}
        </p>
      )}
      <footer>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={close}
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={disabled}
          onClick={() => void (mode === "image" ? saveImage() : saveText())}
        >
          <Save aria-hidden="true" /> {disabled ? "Saving…" : "Save"}
        </Button>
      </footer>
    </section>
  );
}
