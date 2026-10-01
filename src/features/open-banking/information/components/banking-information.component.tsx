import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import styles from "./banking-information.module.css";

type InformationPage = "privacy" | "terms";

const PrivacyContent = () => (
  <>
    <section>
      <h2>What this page covers</h2>
      <p>
        This page describes how the Finance integration handles bank and
        statement data in this private, owner-operated Become installation.
        There is no public signup or public support service.
      </p>
    </section>

    <section>
      <h2>Bank connection data</h2>
      <p>
        A separate consent with the bank authorizes Enable Banking to make
        account data available to Become. Become then synchronizes that data on
        the server. The Finance integration can receive source account
        identifiers, balances, and dated transaction amounts, descriptions and
        counterparties.
      </p>
      <p>
        Become does not collect bank passwords. Private Enable Banking keys
        remain on the server and are not sent to the browser.
      </p>
    </section>

    <section>
      <h2>Statements and Finance records</h2>
      <p>
        A statement upload is processed into file metadata and parsed
        transaction evidence. Become also stores the user&apos;s Finance
        interpretation, including categories, notes, tags, account mappings and
        goal relationships.
      </p>
      <p>
        Imported evidence stays distinct from editable Become interpretation. An
        external account type does not replace the account&apos;s Become name,
        classification or Savings behavior.
      </p>
    </section>

    <section>
      <h2>Systems involved</h2>
      <p>
        The installation runs its application server on Hetzner and stores its
        database in Neon. Enable Banking supplies the consent-based bank data
        connection. These systems process the Finance data needed for the
        integration to operate.
      </p>
    </section>

    <section>
      <h2>Disconnecting and retained history</h2>
      <p>
        Disconnecting a bank connection stops future synchronization. Existing
        ledger entries and imported evidence remain in Become so that Finance
        history and the user&apos;s recorded interpretation are preserved.
      </p>
    </section>

    <section>
      <h2>Optional AI features</h2>
      <p>
        Optional AI features elsewhere in Become may send context selected by
        the user to the configured AI provider. Connecting a bank account does
        not, by itself, send Finance data to an AI provider.
      </p>
    </section>

    <section>
      <h2>Questions and access</h2>
      <p>
        This is an owner-operated private installation. People with access
        already know the owner and can raise questions directly; there is no
        public support or signup channel.
      </p>
    </section>
  </>
);

const TermsContent = () => (
  <>
    <section>
      <h2>Private Finance tool</h2>
      <p>
        Become is used here as a private personal Finance tool. It records and
        interprets financial information; it does not offer bank accounts or
        move money.
      </p>
    </section>

    <section>
      <h2>Bank connections</h2>
      <p>
        Access to bank data is authorized through a separate consent flow. The
        bank&apos;s and Enable Banking&apos;s own consent information and terms
        apply to that connection. Become has no payment-initiation feature.
      </p>
    </section>

    <section>
      <h2>Account meaning stays in Become</h2>
      <p>
        The user controls the Become nickname, account classification and
        Savings policy. Those choices remain separate from the external
        bank&apos;s account type and from the method used to bring data into
        Finance.
      </p>
    </section>

    <section>
      <h2>Credit-card repayment settings</h2>
      <p>
        A linked repayment account records the relationship between accounts
        inside Become. It does not configure or change bank autopay. Card
        purchases remain expenses and observed repayments are treated as
        transfers.
      </p>
    </section>

    <section>
      <h2>Coverage and freshness</h2>
      <p>
        Bank feeds and statement imports can have different coverage, timing and
        freshness. Become shows those qualifications where they affect a
        balance, review or forecast. The connected bank remains the source for
        the current state of the bank account.
      </p>
    </section>

    <section>
      <h2>Private access</h2>
      <p>
        This installation is owner-operated and is not offered as a public
        financial service. Access is limited to people who already know the
        owner; there is no public signup or support channel.
      </p>
    </section>
  </>
);

const pageCopy = {
  privacy: {
    eyebrow: "Finance information",
    title: "Privacy",
    introduction:
      "How bank connections, statement imports and Finance records are handled in this private Become installation.",
  },
  terms: {
    eyebrow: "Finance information",
    title: "Terms of use",
    introduction:
      "The practical terms for using bank connections and Finance records in this private Become installation.",
  },
} as const;

export function BankingInformation({ page }: { page: InformationPage }) {
  const copy = pageCopy[page];
  const relatedHref = page === "privacy" ? "/terms" : "/privacy";
  const relatedLabel = page === "privacy" ? "Terms of use" : "Privacy";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/sign-in" aria-label="Become sign in">
          <BrandMark />
        </Link>
        <Link className={styles.signInLink} href="/sign-in">
          Sign in <ArrowRight aria-hidden="true" />
        </Link>
      </header>

      <article className={styles.article}>
        <Link className={styles.backLink} href="/sign-in">
          <ArrowLeft aria-hidden="true" /> Back to sign in
        </Link>
        <div className={styles.introduction}>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.introduction}</p>
        </div>

        <div className={styles.content}>
          {page === "privacy" ? <PrivacyContent /> : <TermsContent />}
        </div>
      </article>

      <footer className={styles.footer}>
        <span>Become · private installation</span>
        <nav aria-label="Information pages">
          <Link href={relatedHref}>{relatedLabel}</Link>
          <Link href="/sign-in">Sign in</Link>
        </nav>
      </footer>
    </main>
  );
}
