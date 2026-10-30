import type { Preview } from "@storybook/nextjs-vite";
import { geistMono, inter, manrope } from "../src/app/fonts/font.config";
import { InterfaceSoundProvider } from "../src/components/ui/sound/components/interface-sound-provider.component";
import "../src/app/globals.css";

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
    backgrounds: {
      options: {
        become: { name: "Become", value: "#090d13" },
        surface: { name: "Surface", value: "#15191f" },
      },
    },
  },
  initialGlobals: { backgrounds: { value: "become" } },
  decorators: [
    (Story) => (
      <div
        className={`dark ${manrope.variable} ${inter.variable} ${geistMono.variable}`}
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        <InterfaceSoundProvider>
          <Story />
        </InterfaceSoundProvider>
      </div>
    ),
  ],
};

export default preview;
