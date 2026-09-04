export const ENGINEERING_CONTEXT_VALUES = [
  "UNI",
  "INTERNSHIP",
  "PERSONAL",
  "PROFESSIONAL",
] as const;

export const ENGINEERING_CONTEXT_OPTIONS = [
  { value: "UNI", label: "Uni" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "PERSONAL", label: "Personal" },
  { value: "PROFESSIONAL", label: "Professional" },
] as const;

export const ENGINEERING_PROJECT_STATUS_VALUES = [
  "PLANNED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
] as const;

export const ENGINEERING_PROJECT_STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planned" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
] as const;

export const ENGINEERING_EVIDENCE_TYPE_VALUES = [
  "FEATURE_COMPLETED",
  "BUG_SOLVED",
  "CONCEPT_LEARNED",
  "DEPLOYMENT",
  "ARCHITECTURE_DECISION",
  "TECHNICAL_DISCOVERY",
] as const;

export const ENGINEERING_EVIDENCE_TYPE_OPTIONS = [
  { value: "FEATURE_COMPLETED", label: "Feature completed" },
  { value: "BUG_SOLVED", label: "Bug solved" },
  { value: "CONCEPT_LEARNED", label: "Concept learned" },
  { value: "DEPLOYMENT", label: "Deployment" },
  { value: "ARCHITECTURE_DECISION", label: "Architecture decision" },
  { value: "TECHNICAL_DISCOVERY", label: "Technical discovery" },
] as const;

export function getEngineeringContextLabel(value: string | null) {
  return (
    ENGINEERING_CONTEXT_OPTIONS.find((option) => option.value === value)
      ?.label ?? "Unassigned"
  );
}

export function getEngineeringProjectStatusLabel(value: string) {
  return (
    ENGINEERING_PROJECT_STATUS_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}

export function getEngineeringEvidenceTypeLabel(value: string) {
  return (
    ENGINEERING_EVIDENCE_TYPE_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}
