import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import {
  directionFailure,
  directionUser,
} from "@/features/direction/services/direction-http.service";
import {
  livingBannerKindSchema,
  livingBannerLedgerSchema,
} from "@/features/seasons/living/schemas/living-character-banner.schema";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      year: string;
      quarter: string;
      revision: string;
      kind: string;
    }>;
  },
) {
  try {
    const user = await directionUser(request);
    const params = await context.params;
    const year = Number(params.year),
      quarter = Number(params.quarter),
      revision = Number(params.revision);
    const kind = livingBannerKindSchema.safeParse(params.kind);
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(quarter) ||
      !Number.isInteger(revision) ||
      !kind.success
    )
      return new Response(null, { status: 404 });
    const season = await prisma.userSeason.findUnique({
      where: { userId_year_quarter: { userId: user.id, year, quarter } },
      select: { livingPack: { select: { characterBanner: true } } },
    });
    const ledger = livingBannerLedgerSchema.safeParse(
      season?.livingPack?.characterBanner,
    );
    const asset = ledger.success
      ? ledger.data.revisions.find((item) => item.revision === revision)?.[
          kind.data
        ]
      : null;
    if (!asset)
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    const bytes = await getMediaStorage().read(asset.storageKey);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return new Response(null, { status: 404 });
    return directionFailure(error);
  }
}
