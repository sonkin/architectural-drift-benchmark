#!/bin/bash

# Experiment B: Full Benchmark
# Runs all 5 strategies on the Standard Policy Document (Experiment B)
# Iterations: 15
# Atypicality: Low (default)

echo "🚀 STAYING FRESH: Cleaning previous runs..."
rm -rf data/runs/*

echo "═══════════════════════════════════════════════════════"
echo "  EXPERIMENT B: FULL BENCHMARK STARTED"
echo "═══════════════════════════════════════════════════════"

# 1. Incremental (Baseline)
echo ""
echo "▶️  STRATEGY 1/5: Incremental (Baseline)"
npx tsx src/index.ts --strategy incremental  --runs 3 --iterations 15

# 2. Repair (Incremental + Validation)
echo ""
echo "▶️  STRATEGY 2/5: Repair (Incremental + Validation)"
npx tsx src/index.ts --strategy repair  --runs 3 --iterations 15

# 3. Regeneration (Clean Slate)
echo ""
echo "▶️  STRATEGY 3/5: Regeneration (Clean Slate)"
npx tsx src/index.ts --strategy regeneration  --runs 3 --iterations 15

# 4. Regen-Reconcile (Rebirth + Reasoning)
echo ""
echo "▶️  STRATEGY 4/5: Regen-Reconcile (Rebirth + Reasoning)"
npx tsx src/index.ts --strategy regen-reconcile  --runs 3 --iterations 15

# 5. Regen-Full (Feedback Loop)
echo ""
echo "▶️  STRATEGY 5/5: Regen-Full (Feedback Loop)"
npx tsx src/index.ts --strategy regen-full  --runs 3 --iterations 15

echo ""
echo "🎉 BENCHMARK COMPLETE! Results saved in data/runs/"
