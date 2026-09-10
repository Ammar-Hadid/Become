const EVIDENCE_ARRIVAL_STORAGE_KEY =
  "become:motion:engineering-evidence-arrival";
const EVIDENCE_ARRIVAL_WINDOW_MS = 5_000;

type EvidenceArrival = {
  title: string;
  confirmedAt: number;
};

export function rememberEngineeringEvidenceArrival(title: string) {
  try {
    window.sessionStorage.setItem(
      EVIDENCE_ARRIVAL_STORAGE_KEY,
      JSON.stringify({
        title,
        confirmedAt: Date.now(),
      } satisfies EvidenceArrival),
    );
  } catch {
    // Motion is progressive enhancement; storage availability is optional.
  }
}

export function consumeEngineeringEvidenceArrival(title: string) {
  try {
    const stored = window.sessionStorage.getItem(EVIDENCE_ARRIVAL_STORAGE_KEY);
    if (!stored) return false;

    const arrival = JSON.parse(stored) as Partial<EvidenceArrival>;
    const expired =
      typeof arrival.confirmedAt !== "number" ||
      Date.now() - arrival.confirmedAt > EVIDENCE_ARRIVAL_WINDOW_MS;
    if (expired) {
      window.sessionStorage.removeItem(EVIDENCE_ARRIVAL_STORAGE_KEY);
      return false;
    }
    if (arrival.title !== title) return false;

    window.sessionStorage.removeItem(EVIDENCE_ARRIVAL_STORAGE_KEY);
    return true;
  } catch {
    try {
      window.sessionStorage.removeItem(EVIDENCE_ARRIVAL_STORAGE_KEY);
    } catch {
      // Motion is progressive enhancement; storage availability is optional.
    }
    return false;
  }
}
