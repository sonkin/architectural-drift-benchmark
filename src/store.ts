/**
 * Artifact Store - file-based versioning
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data/runs');

export async function saveArtifact(
    runId: string,
    strategy: string,
    iteration: number,
    content: string,
    suffix: string = ''
): Promise<void> {
    const runDirName = suffix ? `${runId}_${strategy}_${suffix}` : `${runId}_${strategy}`;
    const runDir = path.join(DATA_DIR, runDirName);

    if (!existsSync(runDir)) {
        await mkdir(runDir, { recursive: true });
    }

    const filename = `v${String(iteration).padStart(2, '0')}.md`;
    await writeFile(path.join(runDir, filename), content, 'utf-8');
}

export async function loadBlueprint(): Promise<string> {
    const blueprintPath = path.join(PROJECT_ROOT, 'data/blueprint.md');
    return readFile(blueprintPath, 'utf-8');
}

export async function loadPatches(): Promise<string[]> {
    const patchesPath = path.join(PROJECT_ROOT, 'data/patches.json');
    const content = await readFile(patchesPath, 'utf-8');
    return JSON.parse(content);
}

export interface RunMetrics {
    runId: string;
    strategy: string;
    iterations: IterationMetrics[];
}

export interface IterationMetrics {
    iteration: number;
    driftScore: number;
    retries: number;
    converged: boolean;
    vocabularyViolations: number;
    templateViolations: number;
    styleViolations: number;
    crossRefViolations: number;
    atypicalityViolations?: number; // Added for Atypicality experiment
    driftHistory?: number[];  // [initial, after retry 1, ...]
}

export async function saveMetrics(metrics: RunMetrics, suffix: string = ''): Promise<void> {
    const mdTable = formatMetricsAsMarkdown(metrics);
    const filenameBase = suffix ? `${metrics.runId}_${metrics.strategy}_${suffix}_metrics.md` : `${metrics.runId}_${metrics.strategy}_metrics.md`;
    const filename = path.join(DATA_DIR, filenameBase);
    await writeFile(filename, mdTable, 'utf-8');
}

function formatMetricsAsMarkdown(metrics: RunMetrics): string {
    const lines: string[] = [];

    lines.push(`# ${metrics.strategy} | ${metrics.runId}`);
    lines.push('');
    lines.push('| Iter | Drift | Retries | Conv | Vocab | Template | Style | XRef |');
    lines.push('|------|-------|---------|------|-------|----------|-------|------|');

    for (const iter of metrics.iterations) {
        lines.push(
            `| ${iter.iteration} | ${iter.driftScore} | ${iter.retries} | ` +
            `${iter.converged ? '✓' : '✗'} | ${iter.vocabularyViolations} | ` +
            `${iter.templateViolations} | ${iter.styleViolations} | ${iter.crossRefViolations} |`
        );
    }

    // Summary
    const finalDrift = metrics.iterations.at(-1)?.driftScore ?? 0;
    const totalRetries = metrics.iterations.reduce((sum, i) => sum + i.retries, 0);
    const convergedCount = metrics.iterations.filter(i => i.converged).length;

    lines.push('');
    lines.push('## Summary');
    lines.push(`- **Final Drift:** ${finalDrift}`);
    lines.push(`- **Total Retries:** ${totalRetries}`);
    lines.push(`- **Converged:** ${convergedCount}/${metrics.iterations.length}`);

    return lines.join('\n');
}
