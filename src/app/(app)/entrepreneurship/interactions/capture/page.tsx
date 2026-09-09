import { notFound } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { SessionInteractionCapture } from "@/features/entrepreneurship/sessions/components/session-interaction-capture.component";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { session: id } = await searchParams;
  if (!id) notFound();
  const session = await prisma.session.findFirst({
    where: {
      id,
      userId: user.id,
      endedAt: { not: null },
      domain: { slug: "entrepreneurship" },
    },
  });
  if (!session) notFound();
  const options = await getInteractionOptions(user.id);
  return (
    <>
      <Link href="/entrepreneurship/interactions" className="business-back">
        ← Interactions
      </Link>
      <header className="business-section-heading">
        <div>
          <p className="eyebrow">The session is already saved</p>
          <h2>Keep what actually happened.</h2>
          <p>
            These details are only a starting point. Review the event kind, date
            and wording before saving an interaction. Time alone is not customer
            contact.
          </p>
        </div>
      </header>
      <SessionInteractionCapture
        {...options}
        companyId={session.businessCompanyId ?? undefined}
        companyName={session.businessCompanySnapshot ?? undefined}
        prefill={{
          sourceSessionId: id,
          summary: session.outcome ?? "",
          date: DateTime.fromJSDate(session.endedAt!, {
            zone: APP_TIMEZONE,
          }).toISODate()!,
          nicheId: session.businessNicheId,
        }}
      />
    </>
  );
}
