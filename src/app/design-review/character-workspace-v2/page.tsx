import type { Metadata } from "next";
import { CharacterWorkspaceApproval } from "@/features/design-review/character-workspace/components/character-workspace-approval.component";

export const metadata: Metadata = {
  title: "Character workspace design approval · Become",
};

export default function CharacterWorkspaceApprovalPage() {
  return <CharacterWorkspaceApproval />;
}
