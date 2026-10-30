import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useRef, useState } from "react";
import {
  ArtworkUpload,
  type ArtworkUploadAsset,
} from "./artwork-upload.component";

const meta = {
  title: "Forms/Artwork Upload",
  component: ArtworkUpload,
  args: {
    label: "Desktop banner",
    specification: "21:9 desktop · target 2K",
    promptReady: false,
    onPrompt: () => {},
    onUpload: async () => {},
  },
  parameters: {
    docs: {
      description: {
        component:
          "Approved upload treatment. The feature supplies raw-file validation, upload persistence and prompt actions. These examples do not save Season records or call AI.",
      },
    },
  },
} satisfies Meta<typeof ArtworkUpload>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Uploaded: Story = {
  args: {
    asset: {
      href: "/design-review/character-workspace-v3/levi-desktop-v2.webp",
      filename: "Sample desktop banner",
      width: 2172,
      height: 724,
    },
    promptReady: true,
  },
};
export const Phone: Story = {
  args: {
    label: "Mobile scene",
    specification: "9:16 mobile · target 2K",
    asset: {
      href: "/design-review/character-workspace-v3/levi-phone-v2.webp",
      filename: "Sample mobile scene",
      width: 941,
      height: 1672,
    },
  },
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
export const Failure: Story = {
  args: {
    onUpload: async () => {
      throw new Error(
        "Upload failed. Your previous image is preserved. Try again.",
      );
    },
  },
};
function InteractiveUpload() {
  const [asset, setAsset] = useState<ArtworkUploadAsset>();
  const url = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );
  return (
    <ArtworkUpload
      label="Desktop composition"
      specification="Wide image · review example"
      asset={asset}
      promptReady={false}
      onPrompt={() => {}}
      onUpload={async (file) => {
        const bitmap = await createImageBitmap(file);
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(file);
        setAsset({
          href: url.current,
          filename: file.name,
          width: bitmap.width,
          height: bitmap.height,
        });
        bitmap.close();
      }}
    />
  );
}
export const Interactive: Story = { render: () => <InteractiveUpload /> };
