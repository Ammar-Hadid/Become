import { z } from "zod";

const amount = z.object({ amount: z.string(), currency: z.string().length(3) });
const accountIdentity = z
  .object({
    iban: z
      .string()
      .nullish()
      .transform((value) => value ?? undefined),
    other: z
      .object({ identification: z.string(), scheme_name: z.string() })
      .nullish()
      .transform((value) => value ?? undefined),
  })
  .passthrough();
const party = z.object({ name: z.string().optional() }).passthrough();
export const enableInstitutionSchema = z.object({
  name: z.string(),
  country: z.string().length(2),
  logo: z.string().optional(),
  psu_types: z.array(z.string()),
  maximum_consent_validity: z.number().int().positive(),
  required_psu_headers: z.array(z.string()).optional(),
});
export const enableAccountSchema = z
  .object({
    uid: z.string(),
    identification_hash: z.string(),
    identification_hashes: z.array(z.string()).optional(),
    account_id: accountIdentity.optional(),
    currency: z.string().length(3),
    cash_account_type: z.string().optional(),
  })
  .passthrough();
export const enableTransactionSchema = z
  .object({
    entry_reference: z.string().nullish(),
    transaction_id: z.string().nullish(),
    transaction_amount: amount,
    credit_debit_indicator: z.enum(["CRDT", "DBIT"]),
    status: z.enum(["BOOK", "PDNG"]),
    booking_date: z.iso.date().optional(),
    value_date: z.iso.date().optional(),
    transaction_date: z.iso.date().optional(),
    creditor: party.optional(),
    debtor: party.optional(),
    creditor_account: accountIdentity.optional(),
    debtor_account: accountIdentity.optional(),
    remittance_information: z.array(z.string()).optional(),
    reference_number: z.string().optional(),
  })
  .passthrough();
export const enableBalanceSchema = z
  .object({
    name: z.string(),
    balance_amount: amount,
    balance_type: z.string(),
    last_change_date_time: z.string().optional(),
    reference_date: z.iso
      .date()
      .nullish()
      .transform((value) => value ?? undefined),
  })
  .passthrough();
export const enableSessionSchema = z.object({
  session_id: z.string(),
  accounts: z.array(enableAccountSchema),
  aspsp: z.object({ name: z.string(), country: z.string() }),
  access: z.object({ valid_until: z.string() }),
});
