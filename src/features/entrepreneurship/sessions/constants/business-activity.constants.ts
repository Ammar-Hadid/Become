// Applied at the start of a new session. Historical nulls stay unknown.
export const BUSINESS_ACTIVITY_KINDS: Record<string, string> = {
  "niche-research": "PREPARATION",
  "company-research": "PREPARATION",
  "outreach-preparation": "PREPARATION",
  "offer-creation": "PREPARATION",
  learning: "PREPARATION",
  admin: "PREPARATION",
  outreach: "EXTERNAL_CONTACT",
  "follow-up": "EXTERNAL_CONTACT",
  "customer-conversation": "EXTERNAL_CONTACT",
  "sales-meeting": "EXTERNAL_CONTACT",
  delivery: "CLIENT_DELIVERY",
};
