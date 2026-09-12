import sharp from "sharp";
import { fetchPublicImage } from "@/features/seasons/discovery/services/cots-public-image.service";
import type { CotsIdentityView } from "@/features/seasons/discovery/types/cots-discovery.types";
import type { ProviderCandidate } from "@/features/seasons/discovery/types/cots-provider.types";
import {
  deduplicateCotsImageCandidates,
  rankCotsImageCandidates,
} from "@/features/seasons/discovery/utils/cots-image-quality.util";

const RANKED_FINGERPRINT_POOL = 24;
const DISCOVERY_PAGE_SIZE = 16;
const FINGERPRINT_MAXIMUM_BYTES = 2 * 1024 * 1024;
const FINGERPRINT_TIMEOUT_MILLISECONDS = 3_500;
const fingerprintCache = new Map<
  string,
  { expires: number; value: string | null }
>();

function binaryHash(values: Uint8Array) {
  let output = "";
  for (let index = 0; index < values.length; index += 4) {
    let nibble = 0;
    for (let bit = 0; bit < 4; bit++)
      nibble = (nibble << 1) | (values[index + bit] ? 1 : 0);
    output += nibble.toString(16);
  }
  return output;
}

export async function createCotsImageFingerprint(input: Buffer) {
  const { data } = await sharp(input, {
    animated: false,
    failOn: "warning",
    limitInputPixels: 12_000_000,
  })
    .autoOrient()
    .flatten({ background: "#ffffff" })
    .resize(17, 16, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const differenceBits = new Uint8Array(256);
  const averagePixels = new Uint8Array(256);
  for (let row = 0; row < 16; row++)
    for (let column = 0; column < 16; column++) {
      const offset = row * 17 + column;
      differenceBits[row * 16 + column] =
        data[offset] > data[offset + 1] ? 1 : 0;
      averagePixels[row * 16 + column] = data[offset];
    }
  const average =
    averagePixels.reduce((sum, value) => sum + value, 0) / averagePixels.length;
  const averageBits = Uint8Array.from(averagePixels, (value) =>
    value >= average ? 1 : 0,
  );
  return `${binaryHash(differenceBits)}.${binaryHash(averageBits)}`;
}

async function candidateFingerprint(candidate: ProviderCandidate) {
  const key = candidate.imageQuality!.assetKey;
  const cached = fingerprintCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value ?? undefined;
  let value: string | null = null;
  if (candidate.previewUrl)
    try {
      value = await createCotsImageFingerprint(
        await fetchPublicImage(
          candidate.previewUrl,
          FINGERPRINT_MAXIMUM_BYTES,
          FINGERPRINT_TIMEOUT_MILLISECONDS,
        ),
      );
    } catch {
      // Metadata ranking and exact asset keys remain useful when a host blocks thumbnails.
    }
  if (fingerprintCache.size >= 200)
    fingerprintCache.delete(fingerprintCache.keys().next().value!);
  fingerprintCache.set(key, {
    expires: Date.now() + 15 * 60_000,
    value,
  });
  return value ?? undefined;
}

export async function prepareCotsImageCandidates(
  identity: CotsIdentityView,
  candidates: ProviderCandidate[],
  existing: ProviderCandidate[] = [],
) {
  const ranked = rankCotsImageCandidates(identity, candidates).slice(
    0,
    RANKED_FINGERPRINT_POOL,
  );
  const fingerprinted = await Promise.all(
    ranked.map(async (candidate) => {
      const perceptualHash = await candidateFingerprint(candidate);
      return perceptualHash
        ? {
            ...candidate,
            imageQuality: { ...candidate.imageQuality!, perceptualHash },
          }
        : candidate;
    }),
  );
  return deduplicateCotsImageCandidates(fingerprinted, existing).slice(
    0,
    DISCOVERY_PAGE_SIZE,
  );
}
