import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CharacterConfirmation } from "./character-confirmation.component";
const meta = {
  title: "Character/Character Confirmation",
  component: CharacterConfirmation,
  parameters: { layout: "padded" },
  args: {
    aiUsed: false,
    onConfirm: () => {},
    onDifferentVersion: () => {},
    onWrongCharacter: () => {},
    match: {
      name: "Kaoruko Waguri",
      sourceWork: "The Fragrant Flower Blooms with Dignity",
      adaptation: "TV anime",
      images: [
        {
          href: "https://kaoruhana-anime.com/assets/img/chara/img_main_chara_2.png",
          alt: "Kaoruko Waguri official character art",
          sourceUrl: "https://kaoruhana-anime.com/character/",
          sourceLabel: "Official anime character page",
        },
        {
          href: "https://kaoruhana-anime.com/assets/img/chara/img_sub_chara_2.png",
          alt: "Kaoruko Waguri official expressions",
          sourceUrl: "https://kaoruhana-anime.com/character/",
          sourceLabel: "Official anime character page",
        },
      ],
    },
  },
} satisfies Meta<typeof CharacterConfirmation>;
export default meta;
type Story = StoryObj<typeof meta>;
export const RetrievedImages: Story = {};
export const FindingCharacter: Story = { args: { loading: true, match: null } };
export const NoMatch: Story = { args: { match: null } };
export const SourceUnavailable: Story = {
  args: {
    match: null,
    notice: "The source is unavailable. Retry or provide authentic references.",
  },
};
export const ConfirmationPending: Story = { args: { busy: true } };
