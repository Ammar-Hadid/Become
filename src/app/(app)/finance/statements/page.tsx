import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { StatementImportPage } from "@/features/finance/statements/components/statement-import-page.component";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; import?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const parameters = await searchParams;
  return (
    <StatementImportPage
      userId={user.id}
      accountId={parameters.account}
      importId={parameters.import}
    />
  );
}
