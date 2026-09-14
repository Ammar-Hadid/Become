import type { AudienceView } from "@/features/entrepreneurship/audiences/types/audience.types";
export const audienceInclude = { include: { segments: true } } as const;
export function audienceName(value: AudienceView) {
  return (
    [value.personSnapshot, value.companySnapshot].filter(Boolean).join(" · ") ||
    value.audienceLabel ||
    value.audienceContext?.segments.map((s) => s.nameSnapshot).join(", ") ||
    value.audienceContext?.description ||
    "Identity not recorded"
  );
}
export function marketLabel(value?: string | null) {
  return value === "B2C"
    ? "Consumers"
    : value === "B2B"
      ? "Businesses"
      : value === "BOTH"
        ? "Consumers & businesses"
        : value === "UNKNOWN"
          ? "Not sure yet"
          : "Not recorded";
}
export function audienceForm(form: FormData) {
  return {
    ...Object.fromEntries(form),
    segmentIds: form.getAll("segmentIds").map(String),
    segmentNames: form.getAll("segmentNames").map(String),
  };
}
