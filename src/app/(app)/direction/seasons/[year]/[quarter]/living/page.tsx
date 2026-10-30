import { notFound, redirect } from "next/navigation";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";

/** Retired Advanced editing route. Saved packs remain in the guided opening. */
export default async function LivingSeasonPage({
  params,
}: {
  params: Promise<{ year: string; quarter: string }>;
}) {
  const raw = await params;
  const identity = seasonIdentitySchema.safeParse({
    year: Number(raw.year),
    quarter: Number(raw.quarter),
  });
  if (!identity.success) notFound();
  redirect(
    `/direction/seasons/${identity.data.year}/${identity.data.quarter}/opening`,
  );
}
