export type CotsFinalizationImageChoice = {
  key: string;
  selectionId?: string;
  mediaId?: string;
  href: string | null;
  alt: string;
  title: string;
  detail: string;
  status: "SELECTED" | "PENDING" | "IMPORTING" | "READY" | "FAILED";
};

export type CotsFinalizationQuoteChoice = {
  quoteId: string;
  text: string;
  attribution: string;
  detail: string;
  formLabel: string;
  evidenceLabel: string;
};

export type CotsFinalizationChoices = {
  images: CotsFinalizationImageChoice[];
  quotes: CotsFinalizationQuoteChoice[];
  currentImageKey: string | null;
  currentQuoteId: string | null;
};
