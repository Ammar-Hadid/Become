/** Never return raw provider errors: they may contain request bodies or credentials. */
export function nexoProviderError(
  error: unknown,
  provider: string,
  model: string,
) {
  const value =
    error && typeof error === "object"
      ? (error as { status?: number; name?: string; code?: string })
      : {};
  const context = `${provider} model ${model}`;
  if (value.status === 400 && value.code === "invalid_json_schema")
    return `Become sent an output schema that ${provider} rejected. This needs an application fix; changing your key or model profile will not repair the schema. Your saved Season is preserved.`;
  if (value.status === 401)
    return `The ${provider} API key was rejected. Replace it in Settings → Nexo, then retry.`;
  if (value.status === 403 || value.status === 404)
    return `Your account cannot access ${context}. Verify the exact API model ID and project permissions in Settings → Nexo. No fallback model was used.`;
  if (value.status === 400 || value.status === 422)
    return `${context} rejected the request configuration. Check support for Responses, structured outputs, reasoning and (for research) web search. Update the profile in Settings → Nexo, then retry.`;
  if (value.status === 429)
    return `The ${provider} API quota or rate limit was reached. Check API billing and limits, then explicitly retry.`;
  if (
    value.name === "APIConnectionTimeoutError" ||
    value.name === "TimeoutError" ||
    value.name === "AbortError"
  )
    return `${context} timed out. Saved work is preserved. Check the connection and profile timeout before retrying; the provider may have billed the call.`;
  return `Generation with ${context} failed. Check provider availability and Settings → Nexo, then retry. Saved work is preserved.`;
}
