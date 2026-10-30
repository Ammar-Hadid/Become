"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Check, ClipboardCopy, ImagePlus, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { Card } from "@/components/ui/cards/card.component";
import { FieldLabel } from "@/components/ui/forms/field.component";
import { Input } from "@/components/ui/forms/input.component";
import {
  Checkbox,
  SelectionLabel,
  SelectionCopy,
} from "@/components/ui/forms/selection.component";
import { Textarea } from "@/components/ui/forms/textarea.component";
import type { getLivingSeasonPack } from "../queries/living-season.query";
import "../styles/living-character-workspace.css";

type Pack = NonNullable<Awaited<ReturnType<typeof getLivingSeasonPack>>>;
type Kind = "desktop" | "phone" | "avatar";
type PromptPackage = NonNullable<Pack["bannerPromptPackages"][Kind]>;

export function LivingCharacterBannerEditor({
  banner,
  promptPackages,
  busy,
  profileApproved,
  referenceApproved,
  onSave,
  onUpload,
  onCopyPackage,
  onGenerate,
  onApprove,
}: {
  banner: Pack["banner"];
  promptPackages: Pack["bannerPromptPackages"];
  busy: boolean;
  profileApproved: boolean;
  referenceApproved: boolean;
  onSave: (copy: {
    quote: string;
    attribution: string;
    quoteSource: string;
    rightLine: string;
  }) => Promise<boolean>;
  onUpload: (kind: Kind, file: File) => Promise<boolean>;
  onCopyPackage: (imagePackage: PromptPackage) => Promise<void>;
  onGenerate: (kind: Kind) => Promise<void>;
  onApprove: () => Promise<void>;
}) {
  const [likenessConfirmed, setLikenessConfirmed] = useState(false);
  const [quote, setQuote] = useState(banner?.quote ?? "");
  const [attribution, setAttribution] = useState(banner?.attribution ?? "");
  const [quoteSource, setQuoteSource] = useState(banner?.quoteSource ?? "");
  const [rightLine, setRightLine] = useState(banner?.rightLine ?? "");
  const fileInputs = useRef<Record<Kind, HTMLInputElement | null>>({
    desktop: null,
    phone: null,
    avatar: null,
  });
  const slots = [
    {
      kind: "desktop",
      label: "Desktop banner",
      href: banner?.desktopHref,
      detail: "Wide composition · 21:9",
    },
    {
      kind: "phone",
      label: "Phone banner",
      href: banner?.phoneHref,
      detail: "Portrait composition · 9:16",
    },
    {
      kind: "avatar",
      label: "Profile picture",
      href: banner?.avatarHref,
      detail: "Character-specific portrait · square",
    },
  ] as const;

  return (
    <Card
      as="section"
      spacing="action"
      className="living-banner-editor"
      aria-labelledby="living-banner-editor-title"
    >
      <div className="living-banner-editor__head">
        <div>
          <p className="type-overline">CHARACTER ART DIRECTION</p>
          <h2 className="type-section-title" id="living-banner-editor-title">
            Banner, portrait, and copy
          </h2>
          <p className="type-body-sm">
            Each image and line is a reviewed Season revision. Upload your own
            art or generate a draft, then approve the finished set.
          </p>
        </div>
        <span className="type-label">
          {banner?.approved
            ? "Approved"
            : banner?.revision
              ? `Revision ${banner.revision} · needs review`
              : "No revision yet"}
        </span>
      </div>
      <div className="living-banner-editor__slots">
        {slots.map(({ kind, label, href, detail }) => (
          <div className="living-banner-editor__slot" key={kind}>
            {href && (
              <div className="living-banner-editor__preview" data-kind={kind}>
                <Image
                  src={href}
                  alt={`${label} revision preview`}
                  fill
                  unoptimized
                  sizes="(max-width: 50rem) 90vw, 25vw"
                />
              </div>
            )}
            <span className="type-label">{label}</span>
            <span className="type-caption">{detail}</span>
            <span className="type-caption">
              {href ? "Image ready for review" : "Image needed"}
            </span>
            <div className="living-banner-editor__slot-actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!promptPackages[kind]}
                onClick={() => {
                  const imagePackage = promptPackages[kind];
                  if (imagePackage) void onCopyPackage(imagePackage);
                }}
              >
                <ClipboardCopy aria-hidden="true" /> Copy package
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => fileInputs.current[kind]?.click()}
              >
                <ImagePlus aria-hidden="true" /> Upload
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy || !profileApproved || !referenceApproved}
                onClick={() => void onGenerate(kind)}
              >
                <WandSparkles aria-hidden="true" /> Generate
              </Button>
              <input
                className="sr-only"
                ref={(node) => {
                  fileInputs.current[kind] = node;
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                aria-label={`Upload ${label.toLowerCase()}`}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onUpload(kind, file);
                  event.target.value = "";
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="living-banner-editor__copy">
        <FieldLabel>
          Verified quote
          <Textarea
            value={quote}
            maxLength={240}
            onChange={(event) => setQuote(event.target.value)}
          />
        </FieldLabel>
        <FieldLabel>
          Attribution
          <Input
            value={attribution}
            maxLength={120}
            onChange={(event) => setAttribution(event.target.value)}
          />
        </FieldLabel>
        <FieldLabel>
          Quote source or citation
          <Input
            value={quoteSource}
            maxLength={500}
            onChange={(event) => setQuoteSource(event.target.value)}
          />
        </FieldLabel>
        <FieldLabel>
          Right-side line
          <Textarea
            value={rightLine}
            maxLength={100}
            onChange={(event) => setRightLine(event.target.value)}
          />
        </FieldLabel>
      </div>
      <p className="type-caption">
        Verify the quote against its source. A saved edit returns the entire
        banner set to review. Image generation requires an approved profile,
        reference sheet, and configured provider; it uses the Season artwork
        budget.
      </p>
      <SelectionLabel>
        <Checkbox
          checked={likenessConfirmed}
          onChange={(event) => setLikenessConfirmed(event.target.checked)}
        />
        <SelectionCopy>
          I compared the desktop banner, phone banner, and portrait with the
          authentic originals. All preserve this character&apos;s likeness and
          adaptation.
        </SelectionCopy>
      </SelectionLabel>
      <div className="living-banner-editor__actions">
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            void onSave({ quote, attribution, quoteSource, rightLine })
          }
        >
          Save banner copy
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={
            busy ||
            !profileApproved ||
            !referenceApproved ||
            !likenessConfirmed ||
            !banner?.desktopHref ||
            !banner?.phoneHref ||
            !banner?.avatarHref ||
            (Boolean(quote.trim()) && (!attribution.trim() || !quoteSource.trim())) ||
            !rightLine.trim() ||
            banner?.approved
          }
          onClick={() => void onApprove()}
        >
          <Check aria-hidden="true" /> Approve banner
        </Button>
      </div>
    </Card>
  );
}
