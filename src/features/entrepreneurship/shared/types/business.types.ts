export class BusinessError extends Error {}
export type BusinessOption = {
  id: string;
  name: string;
  archivedAt?: Date | null;
};
