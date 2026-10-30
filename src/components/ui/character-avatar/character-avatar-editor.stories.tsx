import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../buttons/button.component";
import { storybookDescription } from "../metadata/utils/storybook-description.util";
import {
  CharacterAvatarEditor,
  DEFAULT_AVATAR_PLACEMENT,
  type AvatarPlacement,
} from "./character-avatar-editor.component";

const generatedSource =
  "/design-review/character-workspace-v3/levi-avatar.webp";
const description = storybookDescription("CharacterAvatarEditor");

function PortraitDemo({ name = "Levi Ackerman" }: { name?: string }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(generatedSource);
  const [placement, setPlacement] = useState<AvatarPlacement>(
    DEFAULT_AVATAR_PLACEMENT,
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>Adjust profile picture</Button>
      {open && (
        <CharacterAvatarEditor
          name={name}
          source={source}
          generatedSource={generatedSource}
          placement={placement}
          previewOnly
          onClose={() => setOpen(false)}
          onApply={(nextSource, nextPlacement) => {
            setSource(nextSource);
            setPlacement(nextPlacement);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

const meta = {
  title: "Character/Portrait Placement",
  component: CharacterAvatarEditor,
  args: {
    name: "Levi Ackerman",
    source: generatedSource,
    generatedSource,
    placement: DEFAULT_AVATAR_PLACEMENT,
    onClose: () => {},
    onApply: () => {},
  },
  parameters: {
    docs: {
      description: {
        component: `${description} This Storybook example keeps changes in memory only.`,
      },
    },
  },
  render: () => <PortraitDemo />,
} satisfies Meta<typeof CharacterAvatarEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GeneratedPortrait: Story = {};
