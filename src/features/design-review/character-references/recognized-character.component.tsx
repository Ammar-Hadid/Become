"use client";
import { RecognizedCharacter as SharedRecognition } from "@/components/ui/recognized-character/recognized-character.component";
import type { TrialReference } from "@/features/seasons/discovery/trial/official-references/types";
import type { ComponentProps } from "react";
export function RecognizedCharacter({
  reference,
  ...props
}: Omit<ComponentProps<typeof SharedRecognition>, "reference"> & {
  reference?: TrialReference;
}) {
  return (
    <SharedRecognition
      {...props}
      reference={
        reference
          ? {
              href: `/api/design-review/character-references/images/${reference.id}`,
              sourceUrl: reference.sourceUrl,
              alt: `${props.name} · from the show`,
            }
          : undefined
      }
    />
  );
}
