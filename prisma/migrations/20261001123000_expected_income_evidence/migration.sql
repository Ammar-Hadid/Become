ALTER TABLE finance_expected_income ADD COLUMN "counterpartyId" TEXT;
ALTER TABLE financial_transaction ADD COLUMN "expectedIncomeId" TEXT, ADD COLUMN "expectedIncomeDueOn" VARCHAR(10);
ALTER TABLE finance_expected_income ADD CONSTRAINT finance_expected_income_counterparty_fkey FOREIGN KEY ("counterpartyId","userId") REFERENCES counterparty(id,"userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE financial_transaction ADD CONSTRAINT financial_transaction_expected_income_fkey FOREIGN KEY ("expectedIncomeId","userId") REFERENCES finance_expected_income(id,"userId") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX financial_transaction_expected_income_occurrence ON financial_transaction("expectedIncomeId","expectedIncomeDueOn");
