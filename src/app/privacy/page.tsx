import type { Metadata } from "next";
import { BankingInformation } from "@/features/open-banking/information/components/banking-information.component";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Become Finance handles bank connections, statement imports and financial records.",
};

export default function PrivacyPage() {
  return <BankingInformation page="privacy" />;
}
