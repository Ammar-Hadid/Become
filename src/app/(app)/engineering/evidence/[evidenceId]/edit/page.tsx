import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EngineeringEvidenceForm } from "@/features/engineering/evidence/components/engineering-evidence-form.component";
import {
  getEngineeringEvidenceById,
  getEngineeringEvidenceFormOptions,
} from "@/features/engineering/queries/engineering.query";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";

export const metadata: Metadata = { title: "Edit Engineering evidence" };

export default async function EditEngineeringEvidencePage({
  params,
}: {
  params: Promise<{ evidenceId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { evidenceId } = await params;
  const [evidence, options] = await Promise.all([
    getEngineeringEvidenceById(user.id, evidenceId),
    getEngineeringEvidenceFormOptions(user.id),
  ]);
  if (!evidence) notFound();
  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow mb-md">Engineering evidence</p>
          <h1>Edit the record.</h1>
        </div>
      </header>
      <section className="mt-4xl">
        <EngineeringEvidenceForm
          evidence={evidence}
          projects={options.projects}
          sessions={options.sessions}
        />
      </section>
    </div>
  );
}
