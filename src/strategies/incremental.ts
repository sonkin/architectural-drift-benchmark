/**
 * Strategy A: Incremental Evolution (Baseline)
 * Simply applies patch to previous artifact without validation.
 */

import { generate } from '../llm/client.js';

const SYSTEM_PROMPT = `You are a technical writer maintaining a Cybersecurity Policy document.
Apply the requested change while preserving the existing strict structure and style.
Return ONLY the complete updated document, no explanations.`;

export async function incrementalEvolve(
    previousArtifact: string,
    patchRequest: string
): Promise<string> {
    const result = await generate({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `Here is the current policy document:

${previousArtifact}

---

Apply the following change:
${patchRequest}

Return the complete updated document.`
    });

    return result;
}
