import { AppWindow, Images, Landmark, Sparkles, UserRound } from "lucide-react";
import { WorkspaceNavigation } from "@/components/ui/workspace/workspace-navigation.component";

const sections = [
  { href: "/settings/application", label: "Application", icon: AppWindow },
  { href: "/settings/personal", label: "Personal", icon: UserRound },
  { href: "/settings/finance", label: "Finance", icon: Landmark },
  { href: "/settings/nexo", label: "Nexo", icon: Sparkles },
] as const;
export function SettingsNavigation({
  imageDirectionOwner = false,
}: {
  imageDirectionOwner?: boolean;
}) {
  const visibleSections = imageDirectionOwner
    ? [
        ...sections,
        {
          href: "/settings/image-direction",
          label: "Image Prompts",
          icon: Images,
        },
      ]
    : sections;
  return (
    <WorkspaceNavigation
      label="Settings sections"
      items={visibleSections.map(({ href, label, icon: Icon }) => ({
        href,
        label,
        icon: <Icon />,
      }))}
    />
  );
}
