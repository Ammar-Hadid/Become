import { useState } from "react";
import Image from "next/image";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PHONE_ARTWORK_VIEWPORT } from "../config/resizable-viewport.config";
import { ResizableViewport } from "./resizable-viewport.component";

function ViewportDemo() {
  const [size, setSize] = useState<{ width: number; height: number }>(
    PHONE_ARTWORK_VIEWPORT.initialSize,
  );
  return (
    <ResizableViewport
      size={size}
      onSizeChange={setSize}
      name="Phone banner review"
    >
      <Image
        src="/design-review/character-workspace-v3/levi-phone-v2.webp"
        alt="Levi phone banner artwork"
        fill
        unoptimized
        sizes="430px"
        style={{ objectFit: "cover" }}
      />
    </ResizableViewport>
  );
}

const meta = {
  title: "Artwork/Resizable Viewport",
  component: ResizableViewport,
  args: {
    size: PHONE_ARTWORK_VIEWPORT.initialSize,
    onSizeChange: () => {},
    children: null,
  },
  render: () => <ViewportDemo />,
} satisfies Meta<typeof ResizableViewport>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PhoneArtwork: Story = {};
