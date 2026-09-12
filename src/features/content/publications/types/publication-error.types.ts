import { DirectionError } from "@/features/direction/services/direction-mutation.service";
export class DuplicatePublicationError extends DirectionError {
  constructor(
    public readonly existingRelease: {
      id: string;
      contentId: string;
      href: string;
      title: string;
    },
  ) {
    super(
      "This release is already recorded. Open the existing work to correct it.",
      "url",
      409,
    );
  }
}
