import { z } from "zod";

export const livingBannerKindSchema = z.enum(["desktop", "phone", "avatar"]);

const asset = z.object({
  storageKey: z.string().min(1),
  prompt: z.string(),
  promptPackage: z.unknown().optional(),
  manualPromptReceipt: z.string().optional(),
  uploadOperationKey:z.string().optional(),
  uploadFingerprint:z.string().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const livingBannerRevisionSchema = z.object({
  revision: z.number().int().positive(),
  identityId: z.string().min(1),
  profileVersion: z.number().int().positive(),
  briefRevision: z.number().int().positive(),
  desktop: asset.optional(),
  phone: asset.optional(),
  avatar: asset.optional(),
  quote: z.string().max(240).default(""),
  attribution: z.string().max(120).default(""),
  quoteSource: z.string().max(500).default(""),
  rightLine: z.string().max(100).default(""),
  crop: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      zoom: z.number().min(1).max(2),
    })
    .default({ x: 0.5, y: 0.5, zoom: 1.24 }),
  approvedAt: z.iso.datetime().optional(),
});

export const livingBannerLedgerSchema = z.object({
  revisions: z.array(livingBannerRevisionSchema).max(100),
});

export type LivingBannerRevision = z.infer<typeof livingBannerRevisionSchema>;
export type LivingBannerKind = z.infer<typeof livingBannerKindSchema>;

export function latestLivingBanner(
  value: unknown,
): LivingBannerRevision | null {
  const parsed = livingBannerLedgerSchema.safeParse(value);
  return parsed.success ? (parsed.data.revisions.at(-1) ?? null) : null;
}

export function livingBannerReady(
  banner: LivingBannerRevision | null,
  identityId: string,
  profileVersion: number,
  briefRevision: number,
) {
  return Boolean(
    banner &&
    banner.approvedAt &&
    banner.identityId === identityId &&
    banner.profileVersion === profileVersion &&
    banner.briefRevision === briefRevision &&
    banner.desktop &&
    banner.phone &&
    banner.avatar &&
    (!banner.quote.trim() ||
      (banner.attribution.trim() && banner.quoteSource.trim())) &&
    banner.rightLine.trim(),
  );
}
