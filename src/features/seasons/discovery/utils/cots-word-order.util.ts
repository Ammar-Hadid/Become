import type {
  CotsCandidateView,
  CotsSelectionView,
} from "@/features/seasons/discovery/types/cots-discovery.types";

export function orderCotsWordCandidates(
  candidates: CotsCandidateView[],
  selections: CotsSelectionView[],
) {
  const selectedRefs = new Set(
    selections
      .filter(({ candidate }) => candidate.form !== "IMAGE")
      .map(({ candidate }) => candidate.candidateRef),
  );
  return [
    ...candidates.filter(({ candidateRef }) => selectedRefs.has(candidateRef)),
    ...candidates.filter(({ candidateRef }) => !selectedRefs.has(candidateRef)),
  ];
}
