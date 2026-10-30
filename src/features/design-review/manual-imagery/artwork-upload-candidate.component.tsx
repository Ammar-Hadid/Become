"use client";
import {
  ArtworkUpload,
  type ArtworkUploadAsset,
} from "@/components/ui/artwork-upload/artwork-upload.component";
import { readPreviewUpload } from "@/features/seasons/media/utils/image-upload-preview.util";
export { readPreviewUpload };
/** Retained demo adapter; live features consume ArtworkUpload with raw-file callbacks. */
export function ArtworkUploadCandidate({
  orientation,
  onUpload,
  failUpload,
  ...props
}: Omit<React.ComponentProps<typeof ArtworkUpload>, "onUpload"> & {
  orientation: "wide" | "portrait" | "square";
  onUpload: (asset: ArtworkUploadAsset) => Promise<void>;
  failUpload?: boolean;
}) {
  return (
    <ArtworkUpload
      {...props}
      onUpload={async (file) => {
        if (failUpload)
          throw new Error(
            "Sample upload failure. Your existing image is preserved. Try again.",
          );
        await onUpload(await readPreviewUpload(file, orientation));
      }}
    />
  );
}
