import Image from "next/image";
import { cn } from "@/lib/styles/utils/class-name.util";

const accountTypeLabel = (type: string) => {
  if (type === "CHECKING") return "Current account";
  if (type === "CREDIT_CARD") return "Credit card";
  if (type === "DIGITAL_WALLET") return "Digital account";
  if (type === "INVESTMENT") return "Investment balance";
  return type
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
};

const namesIssuer = (
  institutionName: string | null | undefined,
  issuer: string,
) =>
  new RegExp(`(^|[^a-z0-9])${issuer}([^a-z0-9]|$)`, "i").test(
    institutionName ?? "",
  );

const artworkForAccount = (type: string, institutionName?: string | null) => {
  if (type === "SAVINGS" || type === "INVESTMENT")
    return {
      src: "/finance/account-artwork/savings-reserve.webp",
      tone: "dark",
    } as const;

  if (type === "CREDIT_CARD" && namesIssuer(institutionName, "ing"))
    return {
      src: "/finance/account-artwork/ivory-credit-card-face.webp",
      tone: "light",
    } as const;
  if (namesIssuer(institutionName, "abn"))
    return {
      src: "/finance/account-artwork/teal-current-card-face.webp",
      tone: "dark",
    } as const;
  if (namesIssuer(institutionName, "ing"))
    return {
      src: "/finance/account-artwork/orange-current-card-face.webp",
      tone: "dark",
    } as const;
  if (namesIssuer(institutionName, "revolut"))
    return {
      src: "/finance/account-artwork/black-current-card-face.webp",
      tone: "dark",
    } as const;
  return {
    src: "/finance/account-artwork/neutral-current-card-face.webp",
    tone: "dark",
  } as const;
};

export function AccountArtwork({
  name,
  type,
  institutionName,
  maskedIdentifier,
  compact = false,
}: {
  name: string;
  type: string;
  institutionName?: string | null;
  maskedIdentifier?: string | null;
  compact?: boolean;
}) {
  const artwork = artworkForAccount(type, institutionName);
  const reserve = type === "SAVINGS" || type === "INVESTMENT";

  return (
    <span
      className={cn(
        "finance-account-artwork",
        compact && "finance-account-artwork--compact",
        reserve && "finance-account-artwork--savings",
        type === "CREDIT_CARD" && "finance-account-artwork--credit",
        !maskedIdentifier && "finance-account-artwork--without-mask",
        artwork.tone === "light" && "finance-account-artwork--light",
      )}
    >
      <Image
        src={artwork.src}
        alt=""
        aria-hidden="true"
        fill
        loading={compact ? "lazy" : "eager"}
        sizes={compact ? "132px" : "(max-width: 720px) 92vw, 420px"}
      />
      <span className="finance-account-artwork-copy">
        <span
          className={cn(
            "finance-account-artwork-bank",
            !institutionName && "is-missing",
          )}
          title={institutionName || "Add bank name"}
        >
          {institutionName || "Add bank name"}
        </span>
        <span className="finance-account-artwork-type">
          {reserve ? "Protected funds" : accountTypeLabel(type)}
        </span>
        <strong className="finance-account-artwork-name" title={name}>
          {name}
        </strong>
        {maskedIdentifier && (
          <small className="finance-account-artwork-mask">
            {maskedIdentifier}
          </small>
        )}
      </span>
    </span>
  );
}
