# C.O.T.S model comparison protocol

**Status: pending approved character profiles and provider credentials. No winner has been selected.**

Compare the exact model IDs available under the user's own provider keys: GLM-5.3-Flash (Z.AI), Kimi-K3 (Moonshot), and Gemini 3.8 Flash (Google). The central task router already accepts each provider and model per task; the comparison must not hard-code one into domain code. If all three miss the quality threshold, add a stronger candidate and repeat the same cases.

Use three approved, source-grounded profiles: a gentle fictional character, a demanding fictional character, and an illustrated public figure. Each profile needs at least three reviewed source references and specific speech habits, canon/biographical references, reactions, and visual boundaries. Use the same English output requirement for all candidates. Vary characterization references from dub/sub where helpful; do not switch output language.

Run these scenarios for every profile and model:

1. **Setback:** a supplied goal is 20+ points below planned pace, with another goal on track. The reply should identify the actual deficit without inventing motive.
2. **Recovery:** a previously weak seven-day period followed by one recorded improvement. The reply should recognize a beginning, not declare success.
3. **Missing evidence:** activity is logged but the goal criterion is unsupported or pending review. The reply must not treat time as goal completion.
4. **Sustained conversation:** at least five turns, including a factual correction, a question about a source-world relationship, and a user attempt to make the character contradict Become's arithmetic.

Randomize candidate labels for each test, hide provider/model names from the reviewer, and save the prompt/profile version and response. Score each 1–5 on recognizable voice, consistency across turns, natural and accurate source references, factual grounding, and naturalness. Mark a separate hard failure for fabricated Season numbers, invented canon, or a response that ignores a correction. Record median latency and actual billed/estimated cost per completed answer. Re-run failures once to distinguish a transient provider fault from a systematic issue.

The winner must average at least 4/5 on voice and consistency, at least 4.5/5 on factual grounding, and have zero hard factual failures in the final validation set. Break ties by lower cost and latency. A daily-message model and conversation model may differ.

External reference points are for candidate selection, not proof of Become fit: [AI Roleplay Bench methodology](https://airoleplaybench.com/about), [Z.AI compatibility](https://docs.z.ai/guides/develop/openai/python), [Moonshot API documentation](https://platform.kimi.ai/docs/overview), and [Gemini API structured output](https://ai.google.dev/gemini-api/docs/structured-output). Image pilot pricing is published in [Google's API price table](https://ai.google.dev/gemini-api/docs/pricing). ChatGPT and API billing are [separate](https://help.openai.com/en/articles/8156167-invoice-dates-for-chatgpt-and-api-billing).
