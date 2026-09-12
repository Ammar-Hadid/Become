import { z } from "zod";
import { validateScriptDocument } from "@/features/content/scripts/utils/content-script-document.util";

export const scriptDocumentSchema = z.unknown().transform((value, context) => {
  try {
    return validateScriptDocument(value);
  } catch (error) {
    context.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "Check this script.",
    });
    return z.NEVER;
  }
});
