export function observationFormEntries(form: FormData) {
  const fallback = String(
    form.get("summary") || form.get("sourceDescription") || "",
  );
  const entries: unknown = JSON.parse(String(form.get("observations") ?? "[]"));
  return Array.isArray(entries)
    ? entries.map((entry) => ({
        ...entry,
        sourceDescription: entry.sourceDescription || fallback,
      }))
    : entries;
}
export function interactionForm(form: FormData) {
  const values = Object.fromEntries(form);
  return {
    ...values,
    segmentIds: form.getAll("segmentIds").map(String),
    segmentNames: form.getAll("segmentNames").map(String),
    participants: JSON.parse(String(values.participants ?? "[]")),
    observations: observationFormEntries(form),
    followUp: values.followUpTitle
      ? { title: values.followUpTitle, dueOn: values.dueOn }
      : undefined,
  };
}
