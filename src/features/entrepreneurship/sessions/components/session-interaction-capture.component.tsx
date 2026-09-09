"use client";
import { useBusinessRouter as useRouter } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { RecordForm } from "@/components/ui/forms/record-form.component";
import { CaptureFields } from "@/features/entrepreneurship/interactions/components/interaction-form.component";
import { logInteractionAction } from "@/features/entrepreneurship/interactions/actions/interaction.action";
export function SessionInteractionCapture(
  props: Parameters<typeof CaptureFields>[0],
) {
  const router = useRouter();
  return (
    <div className="max-w-page w-full">
      <RecordForm
        action={logInteractionAction}
        submitLabel="Save actual interaction"
        onSaved={(result) => {
          if (result.id)
            router.push(`/entrepreneurship/interactions/${result.id}`);
        }}
      >
        <CaptureFields {...props} />
      </RecordForm>
    </div>
  );
}
