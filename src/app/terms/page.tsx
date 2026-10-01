import type { Metadata } from "next";
import { BankingInformation } from "@/features/open-banking/information/components/banking-information.component";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "Terms for using bank connections and financial records in this private Become installation.",
};

export default function TermsPage() {
  return <BankingInformation page="terms" />;
}
