import type {
  ImagePromptReference,
  ImagePromptVariant,
} from "./image-prompt-package.util";
import {
  latestLivingBanner,
  livingBannerReady,
} from "../../schemas/living-character-banner.schema";

/** One reference policy for provider calls and the prompt inspector. Callers supply current reviewed assets. */
export function chooseImageReferences(input: {
  mode: string;
  variant: ImagePromptVariant;
  originals: ImagePromptReference[];
  sheet?: ImagePromptReference;
  portrait?: ImagePromptReference;
  banner?: ImagePromptReference;
  continuity?: ImagePromptReference;
}) {
  if (!input.originals.length)
    throw new Error("Confirm an authentic image of this character before generation.");
  const refs = input.originals.slice(0, 2);
  if (input.variant === "reference-sheet") return refs;
  if (input.mode === "SHEET") {
    if (!input.sheet)
      throw new Error("Approve the current character reference sheet first.");
    refs.push(input.sheet);
    if (input.continuity ?? input.banner)
      refs.push((input.continuity ?? input.banner)!);
  } else if (input.variant.startsWith("scene-")) {
    if (!input.portrait || !(input.continuity ?? input.banner))
      throw new Error("Approve the banner and portrait before making scenes.");
    refs.push(input.portrait, (input.continuity ?? input.banner)!);
  } else if (input.banner) refs.push(input.banner);
  return refs.slice(0, 4);
}

export function currentImageReferences(input: {
  pack: {
    referenceMode: string;
    identityId: string | null;
    briefRevision: number;
    characterBanner: unknown;
    sourceImages: {
      id: string;
      identityId: string;
      adaptation: string;
      approvedAt: Date | null;
      retiredAt?: Date | null;
      storageKey: string;
    }[];
    references: {
      id: string;
      identityId: string;
      profileVersion: number;
      briefRevision: number;
      approvedAt: Date | null;
      storageKey: string;
    }[];
    artwork: {
      id: string;
      identityId: string;
      briefRevision: number;
      chapter: number;
      state: string;
      format: string;
      revision: number;
      approvedAt: Date | null;
      storageKey: string;
      sceneAttemptId?: string | null;
    }[];
    activeSceneAttemptId?: string | null;
  };
  identityId: string;
  adaptation: string;
  profileVersion: number;
  year: number;
  quarter: number;
  variant: ImagePromptVariant;
  slot?: { chapter: number; format: string; state?: string };
}) {
  const { pack, identityId, profileVersion, variant, slot } = input;
  const ref = (kind: string, id: string, storageKey: string, href: string) => ({
    kind,
    id,
    storageKey,
    href,
  });
  const originals = pack.sourceImages
    .filter(
      (i) =>
        i.approvedAt &&
        !i.retiredAt &&
        i.identityId === identityId &&
        i.adaptation === input.adaptation,
    )
    .slice(0, 2)
    .map((i) =>
      ref(
        "canonical-character",
        i.id,
        i.storageKey,
        `/api/direction/seasons/living/source-image/${i.id}`,
      ),
    );
  const sheet = pack.references[0];
  const currentSheet =
    sheet?.approvedAt &&
    sheet.identityId === identityId &&
    sheet.profileVersion === profileVersion &&
    sheet.briefRevision === pack.briefRevision;
  const banner = latestLivingBanner(pack.characterBanner);
  const bannerCurrent =
    banner?.identityId === identityId &&
    banner.profileVersion === profileVersion &&
    banner.briefRevision === pack.briefRevision;
  const bannerApproved = livingBannerReady(
    banner,
    identityId,
    profileVersion,
    pack.briefRevision,
  );
  const kind = slot?.format === "MOBILE" ? "phone" : "desktop";
  const bannerRef = (assetKind: "desktop" | "phone" | "avatar") =>
    banner?.[assetKind]
      ? ref(
          assetKind === "avatar" ? "portrait" : `banner-${assetKind}`,
          String(banner.revision),
          banner[assetKind]!.storageKey,
          `/api/direction/seasons/living/banner/${input.year}/${input.quarter}/${banner.revision}/${assetKind}`,
        )
      : undefined;
  const previous =
    slot &&
    pack.artwork
      .filter(
        (i) =>
          i.approvedAt &&
          (i.sceneAttemptId ?? null) === (pack.activeSceneAttemptId ?? null) &&
          i.identityId === identityId &&
          i.briefRevision === pack.briefRevision &&
          i.format === slot.format &&
          i.chapter < slot.chapter,
      )
      .sort(
        (a, b) =>
          b.chapter - a.chapter ||
          Number(b.state === slot.state) - Number(a.state === slot.state) ||
          b.revision - a.revision ||
          a.id.localeCompare(b.id),
      )[0];
  return chooseImageReferences({
    mode: pack.referenceMode,
    variant,
    originals,
    sheet: currentSheet
      ? ref(
          "reference-sheet",
          sheet.id,
          sheet.storageKey,
          `/api/direction/seasons/living/reference/${sheet.id}`,
        )
      : undefined,
    portrait: bannerApproved ? bannerRef("avatar") : undefined,
    banner: slot
      ? bannerApproved
        ? bannerRef(kind)
        : undefined
      : (variant === "portrait" || variant === "banner-phone") && bannerCurrent
        ? bannerRef("desktop")
        : undefined,
    continuity: previous
      ? ref(
          "previous-scene",
          previous.id,
          previous.storageKey,
          `/api/direction/seasons/living/artwork/${previous.id}`,
        )
      : undefined,
  });
}
