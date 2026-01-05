/**
 * Strategy B: Incremental + Repair
 * Applies patch, validates, retries up to MAX_RETRIES if violations found.
 */

import { generate } from '../llm/client.js';
import { calculateDrift, DriftScore } from '../validators/index.js';

const MAX_RETRIES = 3;

const SYSTEM_PROMPT = `You are a technical writer maintaining a Cybersecurity Policy document.
Apply the requested change while strictly following these rules:
1. Each term from the controlled vocabulary must appear exactly once
2. Every section must have subsections: Purpose, Scope, Directives, Exceptions, Enforcement
3. Max sentence length: 25 words. At least 70% sentences ≤12 words
4. All "See Section X" references must point to existing sections

Return ONLY the complete updated document, no explanations.`;

const REPAIR_PROMPT = `You are a technical writer. The document has violations that must be fixed:

VIOLATIONS:
{violations}

Fix ALL violations while preserving the document structure.
Return ONLY the complete fixed document.`;

export interface RepairResult {
    artifact: string;
    retries: number;
    finalScore: DriftScore;
    converged: boolean;
    driftHistory: number[];  // [initial, after retry 1, after retry 2, ...]
}

export async function repairEvolve(
    previousArtifact: string,
    patchRequest: string
): Promise<RepairResult> {
    // First: apply the patch
    let artifact = await generate({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `Here is the current policy document:

${previousArtifact}

---

Apply the following change:
${patchRequest}

Return the complete updated document.`
    });

    let score = calculateDrift(artifact);
    let retries = 0;
    let prevScore = score.total;
    const driftHistory: number[] = [score.total];  // Start with initial drift

    // Repair loop with early exit if no improvement
    while (score.total > 0 && retries < MAX_RETRIES) {
        retries++;

        const violationsSummary = formatViolations(score);

        artifact = await generate({
            systemPrompt: SYSTEM_PROMPT,
            userPrompt: `Here is a document with violations that must be fixed:

${artifact}

---

⚠️ VIOLATIONS TO FIX:
${violationsSummary}

Fix ALL violations while keeping the document content intact.
Return the complete fixed document.`
        });

        score = calculateDrift(artifact);
        driftHistory.push(score.total);  // Track after each retry

        // Early exit if no improvement
        if (score.total >= prevScore) break;
        prevScore = score.total;
    }

    return {
        artifact,
        retries,
        finalScore: score,
        converged: score.total === 0,
        driftHistory
    };
}

function formatViolations(score: DriftScore): string {
    const lines: string[] = [];

    if (score.vocabulary.violations > 0) {
        lines.push(`Vocabulary: ${score.vocabulary.details.map(d =>
            `"${d.term}" appears ${d.count} times (expected 1)`).join('; ')}`);
    }

    if (score.template.violations > 0) {
        lines.push(`Template: ${score.template.details.map(d =>
            `Section "${d.section}" missing: ${d.missing.join(', ')}`).join('; ')}`);
    }

    if (score.style.violations > 0) {
        lines.push(`Style: ${score.style.longSentences} sentences exceed 25 words`);
    }

    if (score.crossRefs.violations > 0) {
        lines.push(`Cross-refs: Broken references: ${score.crossRefs.details.map(d =>
            d.reference).join(', ')}`);
    }

    return lines.join('\n');
}
