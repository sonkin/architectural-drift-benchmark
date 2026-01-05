#!/usr/bin/env node
/**
 * Drift Experiment CLI - 5 Strategy Configurations
 */

import { Command } from 'commander';
import { runExperiment, Strategy, ALL_STRATEGIES } from './engine.js';
import { getUsageStats, resetUsageStats } from './llm/client.js';

const program = new Command();

program
    .name('drift-experiment')
    .description('Run Architectural Drift experiments with 5 strategies')
    .version('1.0.0');

program
    .option('-s, --strategy <type>',
        'Strategy: incremental, repair, regeneration, regen-reconcile, regen-full, or "all"',
        'incremental')
    .option('-r, --runs <number>', 'Number of runs per strategy', '1')
    .option('-i, --iterations <number>', 'Iterations per run', '15')
    .option('-a, --atypicality <level>', 'Atypicality level: low, mid, high', 'low')
    .action(async (options) => {
        const strategies: Strategy[] = options.strategy === 'all'
            ? ALL_STRATEGIES
            : [options.strategy as Strategy];
        const runs = parseInt(options.runs, 10);
        const iterations = parseInt(options.iterations, 10);

        resetUsageStats();

        console.log('╔═══════════════════════════════════════════════════════╗');
        console.log('║       Architectural Drift Experiment Benchmark        ║');
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log('║ incremental      = baseline (no validation)           ║');
        console.log('║ repair           = incremental + retry loop           ║');
        console.log('║ regeneration     = regenerate from blueprint          ║');
        console.log('║ regen-reconcile  = regeneration + reconciliation      ║');
        console.log('║ regen-full       = reconciliation + retries           ║');
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log(`║ Running:    ${strategies.join(', ').padEnd(43)}║`);
        console.log(`║ Runs:       ${String(runs).padEnd(43)}║`);
        console.log(`║ Iterations: ${String(iterations).padEnd(43)}║`);
        console.log('╚═══════════════════════════════════════════════════════╝');

        for (const strategy of strategies) {
            console.log(`\n${'═'.repeat(55)}`);
            console.log(`  STRATEGY: ${strategy.toUpperCase()}`);
            console.log(`${'═'.repeat(55)}`);

            for (let run = 1; run <= runs; run++) {
                const runId = `run_${String(run).padStart(2, '0')}`;
                await runExperiment({
                    strategy,
                    runId,
                    iterations,
                    atypicalityLevel: options.atypicality as any
                });
            }
        }

        // Print usage stats
        const stats = getUsageStats();
        console.log('\n╔═══════════════════════════════════════════════════════╗');
        console.log('║              📊 USAGE STATISTICS                      ║');
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log(`║ API Calls:     ${String(stats.totalCalls).padEnd(39)}║`);
        console.log(`║ Input Tokens:  ${stats.totalInputTokens.toLocaleString().padEnd(39)}║`);
        console.log(`║ Output Tokens: ${stats.totalOutputTokens.toLocaleString().padEnd(39)}║`);
        console.log(`║ Total Time:    ${(stats.totalTimeMs / 1000).toFixed(1)}s`.padEnd(56) + '║');
        console.log(`║ Est. Cost:     $${stats.estimatedCostUSD.toFixed(4)}`.padEnd(56) + '║');
        console.log('╚═══════════════════════════════════════════════════════╝');

        console.log('\n🎉 All experiments completed!');
    });

program.parse();
