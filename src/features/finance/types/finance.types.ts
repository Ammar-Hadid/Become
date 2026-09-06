export type FinanceFormState = {
  error: string | null;
  success?: string;
  id?: string;
  more?: boolean;
};
export class FinanceError extends Error {}
