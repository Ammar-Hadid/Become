import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { storybookDescription } from "../metadata/utils/storybook-description.util";
import { CharacterBanner } from "./character-banner.component";

const artwork = "/design-review/character-workspace-v3";
const description = storybookDescription("CharacterBanner");

const meta = {
  title: "Character/Character Banner",
  component: CharacterBanner,
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: description } },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 24 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    headingLevel: 1,
    content: {
      name: "Levi Ackerman",
      sourceWork: "Attack on Titan",
      adaptation: "TV anime",
      desktopSrc: `${artwork}/levi-desktop-v2.webp`,
      phoneSrc: `${artwork}/levi-phone-v2.webp`,
      alt: "Levi Ackerman against a lit city skyline",
      quote: "Give up on your dreams and die.",
      attribution: "Levi Ackerman",
      rightLine: "SAME STANDARDS.\nHIGHER CONVERSATIONS.",
    },
  },
  argTypes: { headingLevel: { control: "radio", options: [1, 2] } },
} satisfies Meta<typeof CharacterBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Levi: Story = {};

export const GentleCharacter: Story = {
  args: {
    content: {
      name: "Kaoruko Waguri",
      sourceWork: "The Fragrant Flower Blooms with Dignity",
      adaptation: "TV anime",
      desktopSrc: `${artwork}/gentle-desktop.webp`,
      phoneSrc: `${artwork}/gentle-phone.webp`,
      alt: "A gentle anime character in a warmly lit setting",
      rightLine: "QUIET WARMTH.\nSTEADY COURAGE.",
    },
  },
};

export const LongNameAndCopy: Story = {
  args: {
    content: {
      name: "A Character with an Exceptionally Long Name",
      sourceWork: "An imagined work with a deliberately long title",
      desktopSrc: `${artwork}/gentle-desktop.webp`,
      phoneSrc: `${artwork}/gentle-phone.webp`,
      quote:
        "An extended example quote checks wrapping without changing the approved banner typography or placing copy over the character's face.",
      attribution: "Preview copy",
      rightLine: "A CONSIDERED RESPONSE.\nA DISTINCT PRESENCE.",
    },
  },
};

export const ArtworkUnavailable: Story = {
  args: {
    content: {
      name: "Levi Ackerman",
      sourceWork: "Attack on Titan",
      adaptation: "TV anime",
      desktopSrc: "/missing-character-banner.webp",
      quote: "Give up on your dreams and die.",
      attribution: "Levi Ackerman",
    },
  },
};
