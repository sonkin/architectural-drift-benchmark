# Architectural Drift Experiment Benchmark

Code and data for the paper:  
**"Beyond Patching: Controlling Architectural Drift in AI-Driven Workflows"**  
*Vladimir Sonkin & Cătălin Tudose, 2026*

This repository contains the CLI tool used to empirically validate the **Drift Equation** ($D \propto \alpha \cdot P$) and measure the effectiveness of **Regeneration** strategies.

## Correspondence with Article

| Article Treatment | Code Strategy | Description |
|-------------------|---------------|-------------|
| **Treatment A** | `incremental` | Baseline: apply patches sequentially |
| **Treatment B** | `repair` | Apply patch + fix violations with retry loop (Self-Healing) |
| **Treatment C** | `regen-reconcile` | Regeneration + reconcile conflicting requirements (No Verification) |
| **Treatment D** | `regen-full` | Full system: reconciliation + validation loop (Sentinel) |
| **Experiment C** | flag `--atypicality high` | Tests Pattern Gravity on atypical constraints |

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```
OPENAI_API_KEY=your-api-key-here
```

## Usage

### Quick Test (estimate costs)
```bash
npm run test-all    # 5 strategies × 1 run × 5 iterations
```

### Single Strategy
```bash
npx tsx src/index.ts --strategy incremental --runs 1 --iterations 15
npx tsx src/index.ts --strategy repair --runs 1 --iterations 15
npx tsx src/index.ts --strategy regeneration --runs 1 --iterations 15
npx tsx src/index.ts --strategy regen-reconcile --runs 1 --iterations 15
npx tsx src/index.ts --strategy regen-full --runs 1 --iterations 15
```

### Atypicality Experiment (Experiment C)
Check how "constraint atypicality" affects drift:
```bash
npx tsx src/index.ts --strategy incremental --atypicality mid   # Title Case
npx tsx src/index.ts --strategy incremental --atypicality high  # 3rd-Letter Uppercase
```

### Compare All Strategies
```bash
npm run pilot       # 5 strategies × 1 run × 15 iterations
npm run compare     # 5 strategies × 3 runs × 15 iterations (for paper)
npm run full        # 5 strategies × 3 runs × 30 iterations (production)
```

### Custom Configuration
```bash
npx tsx src/index.ts --strategy all --runs 5 --iterations 20
```

## CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `-s, --strategy` | `incremental` | Strategy: incremental, repair, regeneration, regen-reconcile, regen-full, or "all" |
| `-r, --runs` | `1` | Number of runs per strategy (for statistical significance) |
| `-i, --iterations` | `15` | Number of patches to apply per run |
| `-a, --atypicality` | `low` | Constraint level: `low` (standard), `mid` (Title Case), `high` (3rd letter) |

## Output

Results are saved in `data/runs/`:

```
data/runs/
├── run_01_incremental/
│   ├── v01.md        # Document after patch 1
│   ├── v02.md        # Document after patch 2
│   └── ...
├── run_01_regeneration/
│   └── ...
└── metrics.json      # Drift scores for all runs
```

## Metrics

The benchmark tracks **4 invariants**:

1. **Vocabulary** - Each of 20 technical terms must appear exactly once
2. **Template** - Every section must have: Purpose, Scope, Directives, Exceptions, Enforcement
3. **Style** - Max 25 words/sentence, 70%+ sentences ≤12 words
4. **Cross-references** - All "See Section X" must be valid

**Drift Score** = sum of all violations

## Cost Estimation

After each run, the tool displays:
- API calls made
- Input/output tokens used
- Estimated cost (based on gpt-4o-mini pricing)

## For Academic Publication

Recommended configuration for papers:
```bash
npm run compare     # 3 runs provides mean + std for statistical significance
```

This generates data for:
- Hypothesis testing (paired t-test, ANOVA)
- Confidence intervals
- Reproducibility claims
