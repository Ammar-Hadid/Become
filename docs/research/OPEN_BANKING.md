# Open Banking research and implementation decisions

Research completed for the approved Finance extension, September–October 2026. The existing Become design system is the implementation baseline. Product examples inform interaction decisions; no claim is made that any one interface is universally best.

## Provider and product coverage

| Become account            | Initial source   | Evidence and setup requirement                                                                                                                                   |
| ------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing ABN current      | LIVE_SYNC        | Personal current-account AIS through an aggregator. Verify the exact account during consent.                                                                     |
| Existing ING current      | LIVE_SYNC        | ING's Netherlands consumer current-account AIS documentation supports current accounts. Verify provider access during consent.                                   |
| Existing Savings nickname | LIVE_SYNC        | Map Revolut EUR CURRENT to this existing Become SAVINGS account. Discover the real institution/country and verify returned EUR account before reporting success. |
| ING Credit Card More      | STATEMENT_IMPORT | Current ING Netherlands AIS documentation does not verify card access. Use statement imports; exact ING export layout requires a representative redacted file.   |

Enable Banking is the first integration because its terms permit free private access to the developer's own whitelisted personal accounts. This is not an unrestricted public production subscription. The adapter's monthly provider ceiling defaults to €10. Credentials, provider approval, whitelist/linked-account registration and the user's bank consent remain setup prerequisites. Generic institution listings do not verify any particular account product. [Terms](https://enablebanking.com/terms/), [linked accounts](https://enablebanking.com/docs/api/linked-accounts/), [Netherlands market](https://enablebanking.com/docs/markets/nl/), [Revolut authorization guide](https://auth.enablebanking.com/guides/LT/Revolut/).

ABN's personal PSD2 access explicitly excludes savings. A business premium API is not a substitute for the user's personal product. The approved Revolut mapping avoids that inaccessible product while preserving Become Savings policy. [ABN personal PSD2 scope](https://www.abnamro.nl/en/personal/overabnamro/privacy/amended-law.html), [ABN production requirements](https://developer.abnamro.com/api-products/account-information-psd2/tutorial).

ING's current AIS Netherlands product table does not verify credit-card accounts. Statements are consequently the initial source for ING More. ING's own instructions offer card statement download through app/self-service, but the public guide does not establish a parser fixture or every export format. [ING AIS documentation](https://developer.ing.com/openbanking/products/b6d5093d-626e-41e9-b9e8-ff287bbe2c07/versions/3dd27fb2-23a4-489c-b285-aa9467dbf569/documentation), [card statement guide](https://www.ing.nl/particulier/betalen/creditcards/creditcard-afschrift-lezen).

Provider policy stays in Open Banking. Stable account identification, account-scoped entry references, complete continuation pagination, returned consent validity, rate limits and retry instructions are adapter concerns. Transaction IDs alone and weak amount/date fingerprints are insufficient evidence for silent deduplication. Empty pages can still contain continuation tokens. Initial history and subsequent refresh windows differ by institution. A six-hour starting cadence is configurable and never a Finance rule. [Enable Banking API](https://enablebanking.com/docs/api/reference/), [FAQ](https://enablebanking.com/docs/faq/).

## Requested search coverage

All 24 requested generic searches and the requested product-name searches were completed. Generic UI results were commonly speculative portfolio designs, so the interaction choices below use first-party product/help material. The decisions combine this evidence with the approved Become semantics.

| #   | Search topic                              | Applied pattern                                                                       |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | open banking app dashboard ui             | Today's activity and actionable connection health first.                              |
| 2   | personal finance dashboard ui             | Focused summary; deeper analytics remain in their owning views.                       |
| 3   | bank account connection flow ui           | Institution → consent → map returned accounts → import status.                        |
| 4   | connect bank account fintech ui           | Plain read-access explanation and explicit bank handoff.                              |
| 5   | bank account linking onboarding ui        | Link existing Become identity or create an account inline.                            |
| 6   | transaction review ui                     | Visible individual and bulk acknowledgement controls.                                 |
| 7   | transaction categorization ui             | Inline correction plus separate future-rule opt-in.                                   |
| 8   | uncategorized transactions finance app ui | Missing categories and missing counterparties are separate states.                    |
| 9   | financial inbox ui                        | Today is primary; unresolved previous activity is collapsed.                          |
| 10  | daily transaction activity ui             | Date-grouped activity with recognition and review independently shown.                |
| 11  | transaction feed banking app ui           | One unified event; supporting account identity.                                       |
| 12  | expense categorization dashboard ui       | Category filters drill into the same editable transaction feed.                       |
| 13  | unknown transaction review ui             | Explicit unknown counterparty and original bank description.                          |
| 14  | bank transaction details ui               | Interpretation first; original evidence under disclosure.                             |
| 15  | credit card dashboard ui                  | Debt, pending activity and credit limit kept distinct.                                |
| 16  | credit card balance repayment ui          | Settlement account and recorded schedule; no implication of configuring bank autopay. |
| 17  | credit card statement app ui              | Coverage/freshness and only evidenced or manually entered due values.                 |
| 18  | internal transfer banking ui              | One transfer event with actual observed legs.                                         |
| 19  | recurring payments dashboard ui           | Chronological confirmed upcoming payments.                                            |
| 20  | subscription detection finance app ui     | Derived suggestions; confirmation creates a commitment.                               |
| 21  | cash flow forecast dashboard ui           | Deterministic 7/30/90-day projection with explainable movements.                      |
| 22  | safe to spend banking ui                  | Unallocated after planned payments, with reserve and coverage explanation.            |
| 23  | net worth dashboard ui                    | Assets minus liabilities per currency; no credit-limit assets.                        |
| 24  | savings goal banking app ui               | Account evidence can support a goal without creating an allocation.                   |

### First-party references and reasoning

- **Monzo:** chronological unified activity and one understandable internal transfer; account labels distinguish origins. Bank processing timestamps do not establish an exact purchase time. [Unified feed](https://monzo.com/blog/how-we-unified-our-customers-activity-on-the-new-home-screen), [payment identification](https://monzo.com/help/payments-troubleshooting/unrecognised-payment-web), [transaction detail actions](https://monzo.com/blog/monzo-business-how-to-add-information-to-transactions).
- **Revolut:** account/card overview and explicit transaction category correction. Changing future matching is a separate choice. Card balances, repayments and statements are distinct concerns. [Categories](https://help.revolut.com/en-NL/help/accounts/budget-and-analytics/how-to-assign-and-adjust-categories-for-your-transactions/), [repayments](https://help.revolut.com/en-IE/help/credit-products/credit-cards/credit-card-repayments/), [statements](https://help.revolut.com/en-IE/help/credit-products/credit-cards/credit-card-statements/).
- **YNAB:** mapping to an existing account and repairing a connection without replacing identity; purchases and card payments have different ledger semantics. Visible approve/skip controls complement optional gestures. [Linked accounts](https://support.ynab.com/en_us/linked-accounts-in-ynab-B1991f2Cc), [credit-card payments](https://support.ynab.com/en_us/credit-card-payments-a-guide-r1_506Q1j), [Card Mode](https://www.ynab.com/whats-new/meet-card-mode-transactions-meant-to-be-swiped).
- **Copilot Money:** persistent review state, inline category editing, bulk review and dashboard attention. Become additionally keeps immutable original evidence available. [Web review](https://help.copilot.money/en/articles/11780342-copilot-money-for-web), [dashboard](https://help.copilot.money/en/articles/6045480-dashboard-tab-overview), [cash flow](https://help.copilot.money/en/articles/9682232-cash-flow-tab-overview).
- **Monarch Money:** institution search, independent review versus categorization, connection reliability/freshness and grouped assets/liabilities. [Connection](https://help.monarch.com/hc/en-us/articles/360048393392-Connect-or-Manually-Add-Accounts), [review](https://help.monarch.com/hc/en-us/articles/5528707082516-Reviewing-Transactions), [connection reliability](https://help.monarch.com/hc/en-us/articles/33707613533972-Understanding-Data-Providers-and-Connections), [tracking](https://www.monarch.com/features/tracking).
- **Rocket Money:** upcoming subscriptions/bills sorted by date, with corrections and explicit recurring management. [Recurring views](https://help.rocketmoney.com/en/articles/3117398-where-can-i-view-my-subscriptions-and-bills), [detection/editing](https://help.rocketmoney.com/en/articles/2185531-managing-your-bills-and-subscriptions).
- **Emma:** transfers do not inflate spending; a remaining-budget number is different from bank available balance. [Transfers](https://help.emma-app.com/en/article/what-is-the-transfers-category-1v3upes/), [budget versus balance](https://help.emma-app.com/en/article/why-is-my-left-of-different-from-my-available-balance-nklig0/).
- **N26:** simple account spaces/goals and editable spending categories. Become observes funds; it does not move money like a bank's Spaces feature. [Spaces](https://support.n26.com/en-eu/app-and-features/spaces/how-does-spaces-work?rc=finanzflussn26), [spending](https://support.n26.com/en-es/payments-transfers-and-withdrawals/balance-and-limits/how-to-keep-track-of-my-daily-spending).

## Account artwork

Ordinary AIS institution metadata can provide a logo; it does not establish the user's actual issued card artwork. Personalized card images associated with issuer wallets/tokenization must not be presented as if ordinary account aggregation supplied them. No verified usable individual issuer-card asset was available in this integration.

The implementation therefore uses original generated illustrations inspired by the supplied teal, orange and ivory visual references. Savings has a reserve illustration rather than an issued payment card. Identity, balance and any real masked identifier remain text over the artwork. No invented PAN, expiry or network logo is displayed. Artwork is decorative and does not establish a bank connection or an issued card. Future verified usable provider/issuer assets can replace the decorative asset without changing Finance identity.

### Bank-card design refinement

The product owner requested recognizable bank-card faces with both the Become nickname and actual bank/issuer name on the card. The revised design uses conventional card proportions, thin edges, flat face artwork and a clear issuer/type/account-name hierarchy, rather than a photographic slab or desk backdrop. Bank names come from mapped institutions or explicit account bank/issuer metadata; no issuer is invented from a personal nickname.

Reference checks: ABN's official debit-card material uses recognizable teal geometry and issuer branding. ING's official More product image uses a light face with issuer branding and product type; its newer personal debit design retains orange and uses a portrait layout. Revolut offers several colour/material families, so a generic illustration cannot establish the exact card the user owns. [ABN card reference](https://www.abnamro.nl/nl/prive/betalen/betaalpas/mastercard/index.html), [ING More](https://www.ing.nl/particulier/betalen/creditcards/creditcard), [ING debit design](https://nieuws.ing.nl/nl-NL/258006-ing-markeert-40-jaar-pinnen-in-nederland-met-introductie-vernieuwde-betaalpas/), [Revolut cards](https://www.revolut.com/cards/).

Artwork remains original bank-themed imagery. The visible issuer and Become account name are accessible live text, so renaming an account does not require regenerating its art. Decorative chip details support the physical card visual language; network marks, PAN and expiry are absent unless actually evidenced. Savings retains a reserve illustration and its Savings classification.

## Verification boundary

Mock-provider contract/callback tests and real isolated PostgreSQL worker tests verify the adapter boundary, deduplication and scheduler. They do not establish actual provider sandbox or production coverage. A configured sandbox consent is still required before real consent. Actual Revolut account availability and an ING More redacted representative export remain explicit user setup gates. See [setup](../deployment/OPEN_BANKING.md) and [architecture](../decisions/OPEN_BANKING.md).
