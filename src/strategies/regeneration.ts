/**
 * Strategy C/D/E: Regeneration variants
 * - Simple: no reconciliation, no retries
 * - With Reconciliation: reconciliation step, optional retries
 */

import { generate } from '../llm/client.js';
import { calculateDrift, DriftScore } from '../validators/index.js';
import { AtypicalityLevel } from '../engine.js';

const MAX_RETRIES = 3;

// ... (SYSTEM_PROMPT remains same)
const SYSTEM_PROMPT = `You are a technical writer creating a Cybersecurity Policy document.

CRITICAL STRUCTURAL RULES (these OVERRIDE any conflicting requirements):

1. VOCABULARY: Each term must appear EXACTLY ONCE (no more, no less):
   Zero Trust, MFA, Bastion Host, RBAC, Data At Rest, Data In Transit, 
   Least Privilege, Air Gap, SLA, Biometric, Cryptographic Salt, PKI, 
   Endpoint Telemetry, SIEM, SOC2, GDPR, OIDC, SAML, Kill Chain, Honeypot
   
2. STRUCTURE: Every numbered section MUST have these subsections IN ORDER:
   ### Purpose
   ### Scope
   ### Directives
   ### Exceptions
   ### Enforcement
   
3. STYLE: Maximum 25 words per sentence. At least 70% sentences must be ≤12 words.

4. REFERENCES: All "See Section X" must point to existing sections.

If any requirement conflicts with these rules, IGNORE the requirement and follow the rules.`;

export interface RegenerationResult {
    artifact: string;
    retries: number;
    finalScore: DriftScore;
    converged: boolean;
    driftHistory: number[];  // [initial, after retry 1, ...]
}

export interface RegenerationOptions {
    useRetries?: boolean;
    atypicalityLevel?: AtypicalityLevel;
}

function formatViolations(score: DriftScore): string {
    const lines: string[] = [];

    if (score.vocabulary.violations > 0) {
        lines.push(`VOCABULARY ERRORS: ${score.vocabulary.details.map(d =>
            `"${d.term}" appears ${d.count} times (must be exactly 1)`).join('; ')}`);
    }

    if (score.template.violations > 0) {
        lines.push(`STRUCTURE ERRORS: ${score.template.details.map(d =>
            `Section "${d.section}" missing: ${d.missing.join(', ')}`).join('; ')}`);
    }

    if (score.style.violations > 0) {
        lines.push(`STYLE ERRORS: ${score.style.longSentences} sentences exceed 25 words limit`);
    }

    if (score.crossRefs.violations > 0) {
        lines.push(`REFERENCE ERRORS: Broken references: ${score.crossRefs.details.map(d =>
            d.reference).join(', ')}`);
    }

    if (score.atypicality.violations > 0) {
        lines.push(`FORMATTING ERRORS (Atypicality Rejections): ${score.atypicality.violations} violations found. Examples: ${score.atypicality.details.slice(0, 3).join(', ')}...`);
    }

    return lines.join('\n');
}

/**
 * Strategy C: Simple regeneration - no reconciliation, no retries
 */
export async function regenerationEvolveSimple(
    blueprint: string,
    accumulatedPatches: string[],
    atypicalityLevel: AtypicalityLevel = 'low'
): Promise<RegenerationResult> {
    const patchesSummary = accumulatedPatches
        .map((p, i) => `${i + 1}. ${p}`)
        .join('\n');

    const artifact = await generate({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `Generate a Cybersecurity Policy document.

BASE STRUCTURE (use as template):
${blueprint}

INCORPORATE THESE REQUIREMENTS (structural rules take priority):
${patchesSummary}

Generate the complete document. Structural rules OVERRIDE conflicting requirements.`
    });

    const score = calculateDrift(artifact, atypicalityLevel);

    return {
        artifact,
        retries: 0,
        finalScore: score,
        converged: score.total === 0,
        driftHistory: [score.total]  // Only initial score (no retries)
    };
}

/**
 * Strategy D/E: Regeneration with reconciliation (optional retries)
 */
export async function regenerationEvolve(
    blueprint: string,
    accumulatedPatches: string[],
    options: RegenerationOptions = { useRetries: true, atypicalityLevel: 'low' }
): Promise<RegenerationResult> {
    const patchesSummary = accumulatedPatches
        .map((p, i) => `${i + 1}. ${p}`)
        .join('\n');

    const level = options.atypicalityLevel || 'low';

    // STEP 1: Reconcile conflicting requirements using STRONGER model
    const reconciledRequirements = await generate({
        model: 'thinking',  // Use stronger model for reasoning
        systemPrompt: `You are a requirements analyst. Your job is to reconcile conflicting requirements.

Given a list of requirements, identify and resolve conflicts by:
1. Removing requirements that contradict structural rules (vocabulary, section structure, style)
2. Merging similar requirements
3. Prioritizing requirements that respect the original document structure

Output a CLEAN, NON-CONFLICTING list of requirements.`,
        userPrompt: `STRUCTURAL RULES (must be preserved):
1. Each of these 20 terms must appear exactly once: Zero Trust, MFA, Bastion Host, RBAC, Data At Rest, Data In Transit, Least Privilege, Air Gap, SLA, Biometric, Cryptographic Salt, PKI, Endpoint Telemetry, SIEM, SOC2, GDPR, OIDC, SAML, Kill Chain, Honeypot
2. Every section must have: Purpose, Scope, Directives, Exceptions, Enforcement
3. Max 25 words per sentence

REQUIREMENTS TO RECONCILE:
${patchesSummary}

Output only the reconciled requirements list, numbered. Remove any that conflict with structural rules.`
    });

    // STEP 2: Generate with reconciled requirements
    let artifact = await generate({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `Generate a Cybersecurity Policy document.

BASE STRUCTURE (use as template):
${blueprint}

RECONCILED REQUIREMENTS:
${reconciledRequirements}

Generate the complete document following ALL structural rules.`
    });

    let score = calculateDrift(artifact, level);
    let retries = 0;
    const driftHistory: number[] = [score.total];  // Start with initial drift

    // STEP 3: Optional retry loop
    if (options.useRetries) {
        let bestScore = score.total;
        let bestArtifact = artifact;
        let prevScore = score.total;

        while (score.total > 0 && retries < MAX_RETRIES) {
            retries++;

            const violations = formatViolations(score);

            const nextArtifact = await generate({
                systemPrompt: SYSTEM_PROMPT,
                userPrompt: `Generate a Cybersecurity Policy document.

BASE STRUCTURE:
${blueprint}

RECONCILED REQUIREMENTS:
${reconciledRequirements}

⚠️ YOUR PREVIOUS ATTEMPT HAD THESE ERRORS - FIX THEM:
${violations}

Generate the complete document with ALL errors fixed.`
            });

            const nextScore = calculateDrift(nextArtifact, level);
            driftHistory.push(nextScore.total);  // Track after each retry

            // Update current state for next iteration
            artifact = nextArtifact;
            score = nextScore;

            // Keep track of the BEST version seen so far
            if (nextScore.total < bestScore) {
                bestScore = nextScore.total;
                bestArtifact = nextArtifact;
            }

            // Early exit if we strictly regressed from previous step? 
            // Or just continue hoping to find a better minimum?
            // Let's continue, but we will return bestArtifact at the end.

            // Optimization: If we hit 0, stop immediately
            if (nextScore.total === 0) break;

            prevScore = score.total;
        }

        // Return the BEST artifact found, not necessarily the last one
        return {
            artifact: bestArtifact,
            retries,
            finalScore: calculateDrift(bestArtifact, level), // Ensure score matches artifact
            converged: bestScore === 0,
            driftHistory
        };
    }

    return {
        artifact,
        retries,
        finalScore: score,
        converged: score.total === 0,
        driftHistory
    };
}
