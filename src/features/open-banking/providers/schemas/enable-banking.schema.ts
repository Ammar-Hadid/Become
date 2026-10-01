import { z } from "zod";

function optionalBankValue<S extends z.ZodType>(schema: S) {
  return schema.nullish().transform((value) => value ?? undefined);
}

const amount = z.object({ amount: z.string(), currency: z.string().length(3) });
const accountIdentity = z
  .object({
    iban: optionalBankValue(z.string()),
    other: optionalBankValue(
      z.object({ identification: z.string(), scheme_name: z.string() }),
    ),
  })
  .passthrough();
const party = z.object({ name: optionalBankValue(z.string()) }).passthrough();
export const enableInstitutionSchema = z.object({
  name: z.string(),
  country: z.string().length(2),
  logo: optionalBankValue(z.string()),
  psu_types: z.array(z.string()),
  maximum_consent_validity: z.number().int().positive(),
  required_psu_headers: optionalBankValue(z.array(z.string())),
});
export const enableAccountSchema = z
  .object({
    uid: z.string(),
    identification_hash: z.string(),
    identification_hashes: optionalBankValue(z.array(z.string())),
    account_id: optionalBankValue(accountIdentity),
    currency: z.string().length(3),
    cash_account_type: optionalBankValue(z.string()),
  })
  .passthrough();
export const enableTransactionSchema = z
  .object({
    entry_reference: z.string().nullish(),
    transaction_id: z.string().nullish(),
    transaction_amount: amount,
    credit_debit_indicator: z.enum(["CRDT", "DBIT"]),
    status: z.enum(["BOOK", "PDNG"]),
    booking_date: optionalBankValue(z.iso.date()),
    value_date: optionalBankValue(z.iso.date()),
    transaction_date: optionalBankValue(z.iso.date()),
    creditor: optionalBankValue(party),
    debtor: optionalBankValue(party),
    creditor_account: optionalBankValue(accountIdentity),
    debtor_account: optionalBankValue(accountIdentity),
    remittance_information: optionalBankValue(z.array(z.string())),
    reference_number: optionalBankValue(z.string()),
  })
  .passthrough();
export const enableBalanceSchema = z
  .object({
    name: z.string(),
    balance_amount: amount,
    balance_type: z.string(),
    last_change_date_time: optionalBankValue(z.string()),
    reference_date: optionalBankValue(z.iso.date()),
  })
  .passthrough();
export const enableSessionSchema = z.object({
  session_id: z.string(),
  accounts: z.array(enableAccountSchema),
  aspsp: z.object({ name: z.string(), country: z.string() }),
  access: z.object({ valid_until: z.string() }),
});
