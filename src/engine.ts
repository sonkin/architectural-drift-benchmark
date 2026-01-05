/**
 * Main Evolution Engine - supports 5 strategy configurations
 */

import { incrementalEvolve } from './strategies/incremental.js';
import { repairEvolve } from './strategies/repair.js';
import { regenerationEvolve, regenerationEvolveSimple } from './strategies/regeneration.js';
import { calculateDrift } from './validators/index.js';
import { saveArtifact, saveMetrics, loadBlueprint, loadPatches, RunMetrics, IterationMetrics } from './store.js';

// 5 Strategy configurations
export type Strategy =
    | 'incremental'         // baseline: no retries, no reconciliation
    | 'repair'              // incremental + retries
    | 'regeneration'        // regeneration without reconciliation or retries
    | 'regen-reconcile'     // regeneration + reconciliation (no retries)
    | 'regen-full';         // regeneration + reconciliation + retries

export const ALL_STRATEGIES: Strategy[] = [
    'incremental',
    'repair',
    'regeneration',
    'regen-reconcile',
    'regen-full'
];

export type AtypicalityLevel = 'low' | 'mid' | 'high';

export function getAtypicalityPrompt(level: AtypicalityLevel): string {
    if (level === 'mid') {
        return '\n\nCONSTRAINT: You must write in Title Case. ALL words (including small ones like "is", "the", "a") must start with a Capital Letter.';
    }
    if (level === 'high') {
        return '\n\nCONSTRAINT: You must write in 3rd-Letter-Uppercase Case. The third letter of every word (if it exists) must be capitalized (e.g., "heLlo woRld", "teSt", "is", "a", "coMplex"). ALL OTHER letters must be lowercase (except the first letter if it starts a sentence). DO NOT use Title Case or random caps.';
    }
    return '';
}

export interface EngineOptions {
    strategy: Strategy;
    runId: string;
    iterations: number;
    atypicalityLevel?: AtypicalityLevel;
}

// Helper for detailed logging
function formatDriftDetails(m: IterationMetrics): string {
    const details: string[] = [];
    if (m.vocabularyViolations > 0) details.push(`Vocab:${m.vocabularyViolations}`);
    if (m.templateViolations > 0) details.push(`Templ:${m.templateViolations}`);
    if (m.styleViolations > 0) details.push(`Style:${m.styleViolations}`);
    if (m.crossRefViolations > 0) details.push(`Ref:${m.crossRefViolations}`);
    if (m.atypicalityViolations && m.atypicalityViolations > 0) details.push(`Atyp:${m.atypicalityViolations}`);

    return details.length > 0 ? ` (${details.join(', ')})` : '';
}

export async function runExperiment(options: EngineOptions): Promise<RunMetrics> {
    const { strategy, runId, iterations } = options;

    console.log(`\n🚀 Starting run: ${runId} with strategy: ${strategy}`);
    console.log(`   Iterations: ${iterations} | Atypicality: ${options.atypicalityLevel || 'low'}\n`);

    const blueprint = await loadBlueprint();
    const patches = await loadPatches();

    const metrics: RunMetrics = {
        runId,
        strategy,
        iterations: []
    };

    let currentArtifact = blueprint;
    const accumulatedPatches: string[] = [];

    for (let i = 1; i <= Math.min(iterations, patches.length); i++) {
        const patch = patches[i - 1];
        accumulatedPatches.push(patch);

        console.log(`  [${i}/${iterations}] Applying patch: "${patch.slice(0, 50)}..."`);

        let iterationMetrics: IterationMetrics;

        switch (strategy) {
            case 'incremental': {
                // Baseline: no retries
                // Inject prompt constraint
                const promptSuffix = getAtypicalityPrompt(options.atypicalityLevel || 'low');
                currentArtifact = await incrementalEvolve(currentArtifact, patch + promptSuffix);
                const score = calculateDrift(currentArtifact, options.atypicalityLevel || 'low');
                iterationMetrics = {
                    iteration: i,
                    driftScore: score.total,
                    retries: 0,
                    converged: true,
                    vocabularyViolations: score.vocabulary.violations,
                    templateViolations: score.template.violations,
                    styleViolations: score.style.violations,
                    crossRefViolations: score.crossRefs.violations,
                    atypicalityViolations: score.atypicality.violations
                };
                break;
            }

            case 'repair': {
                // Incremental + retries
                const promptSuffix = getAtypicalityPrompt(options.atypicalityLevel || 'low');
                const result = await repairEvolve(currentArtifact, patch + promptSuffix);
                currentArtifact = result.artifact;

                // Recalculate score to include atypicality (if repairEvolve didn't fix it fully or to measure it identically)
                const score = calculateDrift(currentArtifact, options.atypicalityLevel || 'low');

                iterationMetrics = {
                    iteration: i,
                    driftScore: score.total, // Use total score including atypicality
                    retries: result.retries,
                    converged: result.converged,
                    vocabularyViolations: score.vocabulary.violations,
                    templateViolations: score.template.violations,
                    styleViolations: score.style.violations,
                    crossRefViolations: score.crossRefs.violations,
                    atypicalityViolations: score.atypicality.violations,
                    driftHistory: result.driftHistory
                };

                // Show drift progression
                const breakdown = formatDriftDetails(iterationMetrics);
                if (result.driftHistory && result.driftHistory.length > 1) {
                    console.log(`          Drift: ${result.driftHistory.join(' → ')} | Retries: ${result.retries}${breakdown}`);
                } else {
                    console.log(`          Drift: ${iterationMetrics.driftScore} | Retries: ${iterationMetrics.retries}${breakdown}`);
                }
                break;
            }

            case 'regeneration': {
                // Regeneration without reconciliation or retries
                const promptSuffix = getAtypicalityPrompt(options.atypicalityLevel || 'low');
                // Append constraint to blueprint for regeneration
                const effectiveBlueprint = blueprint + promptSuffix;

                const result = await regenerationEvolveSimple(effectiveBlueprint, accumulatedPatches, options.atypicalityLevel);
                currentArtifact = result.artifact;
                // Score is already calculated inside result.finalScore, but to align with other blocks we can just use it or recalc.
                // Actually result.finalScore is calculated with correct level inside.

                // We need to construct iterationMetrics but we need 'score' independently or from result?
                // Use result.finalScore
                const score = result.finalScore;

                iterationMetrics = {
                    iteration: i,
                    driftScore: score.total,
                    retries: 0,
                    converged: result.converged,
                    vocabularyViolations: score.vocabulary.violations,
                    templateViolations: score.template.violations,
                    styleViolations: score.style.violations,
                    crossRefViolations: score.crossRefs.violations,
                    atypicalityViolations: score.atypicality.violations
                };
                break;
            }

            case 'regen-reconcile': {
                // Regeneration + reconciliation (no retries)
                const promptSuffix = getAtypicalityPrompt(options.atypicalityLevel || 'low');
                const effectiveBlueprint = blueprint + promptSuffix;

                const result = await regenerationEvolve(
                    effectiveBlueprint,
                    accumulatedPatches,
                    {
                        useRetries: false,
                        atypicalityLevel: options.atypicalityLevel
                    }
                );
                currentArtifact = result.artifact;
                const score = result.finalScore;

                iterationMetrics = {
                    iteration: i,
                    driftScore: score.total,
                    retries: 0,
                    converged: result.converged,
                    vocabularyViolations: score.vocabulary.violations,
                    templateViolations: score.template.violations,
                    styleViolations: score.style.violations,
                    crossRefViolations: score.crossRefs.violations,
                    atypicalityViolations: score.atypicality.violations
                };
                break;
            }

            case 'regen-full': {
                // Regeneration + reconciliation + retries (Global Feedback Loop)
                const promptSuffix = getAtypicalityPrompt(options.atypicalityLevel || 'low');
                const effectiveBlueprint = blueprint + promptSuffix;

                const result = await regenerationEvolve(
                    effectiveBlueprint,
                    accumulatedPatches,
                    {
                        useRetries: true,
                        atypicalityLevel: options.atypicalityLevel
                    }
                );
                currentArtifact = result.artifact;
                const score = result.finalScore;

                iterationMetrics = {
                    iteration: i,
                    driftScore: score.total,
                    retries: result.retries,
                    converged: result.converged,
                    vocabularyViolations: score.vocabulary.violations,
                    templateViolations: score.template.violations,
                    styleViolations: score.style.violations,
                    crossRefViolations: score.crossRefs.violations,
                    atypicalityViolations: score.atypicality.violations,
                    driftHistory: result.driftHistory
                };

                // Log detailed drift trace for regen-full
                const breakdown = formatDriftDetails(iterationMetrics);
                console.log(`          Drift: ${result.driftHistory.join(' → ')} | Retries: ${result.retries}${breakdown}`);
                break;
            }

            default:
                throw new Error(`Unknown strategy: ${strategy}. Valid options: ${ALL_STRATEGIES.join(', ')}`);
        }

        // Don't print for repair which prints itself, but do print for others
        if (strategy !== 'repair' && strategy !== 'regen-full') {
            const breakdown = formatDriftDetails(iterationMetrics);
            console.log(`          Drift: ${iterationMetrics.driftScore} | Retries: ${iterationMetrics.retries}${breakdown}`);
        }

        const suffix = (options.atypicalityLevel && options.atypicalityLevel !== 'low') ? `atyp_${options.atypicalityLevel}` : '';
        await saveArtifact(runId, strategy, i, currentArtifact, suffix);
        metrics.iterations.push(iterationMetrics);
    }

    const suffix = (options.atypicalityLevel && options.atypicalityLevel !== 'low') ? `atyp_${options.atypicalityLevel}` : '';
    await saveMetrics(metrics, suffix);
    console.log(`\n✅ Run complete. Total drift at end: ${metrics.iterations.at(-1)?.driftScore ?? 0}\n`);

    return metrics;
}
