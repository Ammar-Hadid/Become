import type { DashboardLens } from "@/features/dashboard/lenses/types/dashboard-lens.types";

// Preview copy until the daily, domain-specific C.O.T.S message is connected.
export const cotsDailyPreviewMessages: Record<DashboardLens, string> = {
  dashboard: "Every day is another chance to grow, {name}. Take on what's ahead, give it your all, and surpass yesterday!",
  engineering: "That tough problem? Perfect training, {name}. Stay curious, try another angle, and turn every attempt into your next breakthrough!",
  finance: "Keep your eye on the goal, {name}. One smart choice at a time, you're building the strength to go further!",
  entrepreneurship: "Go meet the challenge, {name}! Every conversation teaches you something. Listen, adapt, and come back stronger for the next one!",
  content: "Make the thing, {name}, then make it better! Every draft trains your instincts. Put it out there and keep growing!",
};
