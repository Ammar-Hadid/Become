import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef, useState } from "react";
import { Button } from "../buttons/button.component";
import { RecognizedCharacter } from "./recognized-character.component";
import { VersionDrawer } from "./version-drawer.component";
const meta = {
  title: "Character/Recognized Character",
  component: RecognizedCharacter,
  parameters: { layout: "padded" },
  args: {
    name: "Levi Ackerman",
    sourceWork: "Attack on Titan",
    adaptation: "TV anime · 2013",
    reference: {
      href: "/design-review/character-workspace-v3/levi-avatar.webp",
      sourceUrl: "https://anilist.co/character/45627",
      alt: "Storybook sample artwork; not an authentic original",
    },
    actions: (
      <>
        <Button variant="ghost" size="sm">
          Change character
        </Button>
        <Button variant="ghost" size="sm">
          Change version
        </Button>
      </>
    ),
  },
} satisfies Meta<typeof RecognizedCharacter>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Recognized: Story = {};
export const NoPicture: Story = { args: { reference: undefined } };
export const FailedPicture: Story = {
  args: {
    reference: {
      href: "/missing-recognition-image.jpg",
      sourceUrl: "https://anilist.co/character/45627",
    },
  },
};
export const Phone: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 350 }}>
        <Story />
      </div>
    ),
  ],
};
export const EditionSelection: Story = {
  render: function EditionSelection(args) {
    const [open, setOpen] = useState(false),
      [selected, setSelected] = useState(1);
    const trigger = useRef<HTMLButtonElement>(null);
    return (
      <>
        <RecognizedCharacter
          {...args}
          actions={
            <>
              <Button variant="ghost" size="sm">
                Change character
              </Button>
              <Button
                ref={trigger}
                variant="ghost"
                size="sm"
                onClick={() => setOpen(true)}
              >
                Change version
              </Button>
            </>
          }
        />
        <VersionDrawer
          open={open}
          selected={selected}
          works={[
            { id: 1, title: "Attack on Titan", medium: "TV anime", year: 2013 },
            { id: 2, title: "Attack on Titan", medium: "Manga", year: 2009 },
          ]}
          trigger={trigger}
          onClose={() => setOpen(false)}
          onSelect={(id) => {
            setSelected(id);
            setOpen(false);
          }}
        />
      </>
    );
  },
};
