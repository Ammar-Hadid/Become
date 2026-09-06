"use server";
import { financeMutation } from "@/features/finance/services/finance-mutation.service";
import {
  saveSavingsGoal,
  archiveSavingsGoal,
  rebalanceSavings,
} from "@/features/finance/savings/services/savings-goal.service";
import {
  recordGoalPurchase,
  linkGoalExpense,
} from "@/features/finance/savings/services/goal-purchase.service";
export async function saveGoalAction(data: FormData) {
  return financeMutation(async (userId) => {
    const goal = await saveSavingsGoal(
      userId,
      {
        ...Object.fromEntries(data),
        confirmBelowSpent: data.has("confirmBelowSpent"),
      },
      String(data.get("id") || "") || undefined,
    );
    return { id: goal.id };
  });
}
export async function rebalanceAction(data: FormData) {
  return financeMutation((userId) =>
    rebalanceSavings(
      userId,
      String(data.get("currency")),
      [...data.entries()]
        .filter(([key]) => key.startsWith("allocation:"))
        .map(([key, value]) => ({ id: key.slice(11), amount: String(value) })),
    ),
  );
}
export async function archiveGoalAction(data: FormData) {
  return financeMutation((userId) =>
    archiveSavingsGoal(userId, String(data.get("id")), data.has("release")),
  );
}
export async function purchaseGoalAction(data: FormData) {
  return financeMutation((userId) =>
    recordGoalPurchase(
      userId,
      String(data.get("goalId")),
      Object.fromEntries(data),
      String(data.get("spending")),
      String(data.get("release") || "0"),
      data.has("complete"),
    ),
  );
}
export async function linkGoalExpenseAction(data: FormData) {
  return financeMutation((userId) =>
    linkGoalExpense(
      userId,
      String(data.get("transactionId")),
      String(data.get("goalId")),
      String(data.get("spending")),
    ),
  );
}
