---
initial date: 2026-4-1
---

# Construction Workflow

**Authors:** Z. Zhang & Claude Opus 4.6 (Anthropic)

A structured workflow for producing build analysis documents (like `data/books/剑九.md`)
using RAG data, simulator validation, and Claude reasoning.

## Overview

The workflow has 5 phases. Phase 1 gathers data automatically. Phases 2 and 4 use
Claude's reasoning (via `sequential-thinking` MCP). Phase 3 validates with the simulator.
Phase 5 generates the document.

```
Phase 1: Data Gathering    → context.json (automatic)
Phase 2: Construction       → build table + rationale (reasoning)
Phase 3: Validation         → sim sweep confirmation (automatic)
Phase 4: Analysis           → timelines, chains, gaps (reasoning)
Phase 5: Document           → data/books/{name}.md (generation)
```

## How to Run

### Step 1: Generate context

```bash
bun scripts/construct-data.ts --character "剑九" --scenario "pvp vs stronger" --school Sword
```

This outputs `data/builds/剑九-pvp-vs-stronger/context.json` (~90KB) containing:
- All 28 platforms with effects, functions, archetypes
- Full affix pool (universal, school, exclusive)
- Function-combo rankings (top 5 per function x platform)
- Time-series factor vectors per book

### Step 2: Run the reasoning workflow

In Claude Code, tell Claude:

> Construct a build using the workflow in docs/books/workflow.construct.md.
> Context: data/builds/剑九-pvp-vs-stronger/context.json
> Scenario: pvp vs stronger opponent, 剑修 (Sword school)

Claude will follow the phase templates below.

---

## Phase 1: Data Gathering (automatic)

**Tool:** `bun scripts/construct-data.ts`

**Input:** character name, scenario, school

**Output:** `context.json` with:
- `platforms`: per-book data (school, dBase, hits, effects, functions)
- `affixes`: categorized affix pool
- `functionRankings`: top combos per function x platform
- `timeSeriesVectors`: per-second factor values
- `constraints`: construction rules

No reasoning needed. This phase is fully automated.

---

## Phase 2: Construction (reasoning)

**Tool:** Claude `sequential-thinking` MCP

**Input:** context.json + scenario description

**Output:** Build table(s) with per-slot rationale + variation candidates

### Template: Phase 2 Reasoning Steps

Follow `docs/books/guide.build.md` Steps 1-6. Use context.json data for each step.

#### Step 2.1: Scenario Analysis

Read the scenario description. Answer:
- Is the opponent stronger, equal, or weaker?
- Does the opponent have healing? Damage reduction? Initial immunity?
- Expected fight duration: 1 cycle (30s) or 2+ cycles?

Output: scenario observables table.

#### Step 2.2: Theme Selection

Using the scenario observables, select a theme (1-5) from guide.build.md:
- Theme 1 (alpha=1.0): All attack, kill fast
- Theme 2 (alpha=0.8): Attack + buff
- Theme 3 (alpha=0.6): Attack + buff + debuff (most common PvP)
- Theme 4 (alpha=0.4): Survive + some attack
- Theme 5 (alpha=0.0): All defense

Output: chosen theme + rationale.

#### Step 2.3: Slot Objectives

For each slot (1-6), assign function categories based on slot timing:

| Slot | Time | Natural functions | Why |
|:-----|:-----|:-----------------|:----|
| 1 | t=0 | F_burst or opener | Alpha strike, enemy full HP |
| 2 | t=6 | F_burst, F_exploit | Follow-up, %maxHP while HP high |
| 3 | t=12 | F_buff | Buff duration covers slots 4-6 |
| 4 | t=18 | F_burst + utility | Under buff window |
| 5 | t=24 | F_hp_exploit, F_truedmg | Own HP low, debuffs accumulated |
| 6 | t=30 | F_burst + F_dr_remove | Finisher, ignore reduction |

Adjust based on theme: Theme 1 = all F_burst, Theme 3 = slots 4-5 get utility.

Output: slot objectives table.

#### Step 2.4: Platform Selection

For each slot, choose a platform from context.json `platforms` whose `nativeFunctions`
best match the slot's assigned functions.

Use `dBase` as tiebreaker (higher = better for burst slots).
Use `timeSeriesVectors[book].slotCoverage` to check if effects span the right window.

Output: platform per slot with rationale.

#### Step 2.5: Aux Affix Selection

For each slot, select 2 aux affixes. Use `functionRankings` from context.json:
1. Look up the slot's primary function in `functionRankings`
2. Find the platform's ranked combos
3. Pick the top combo that doesn't conflict with other slots' selections

Cross-reference with `constraints.rules`: no duplicate aux books across slots.

Output: aux affix selections per slot with source books.

#### Step 2.6: Variation Identification

Look for slots where a different platform or affix choice creates a meaningfully
different build (not just a marginal tweak). Common variation points:
- Slot 1: offensive opener vs defensive/counter opener
- Slot 4-5: burst vs utility tradeoff

If variations exist, produce a second build table (Variation B) with only the
changed slots and a note explaining the A vs B tradeoff.

Output: build table(s) in this format:

| Slot | 主位 | 辅位1 | 辅位2 |
|------|------|-------|-------|
| 1 | book | affix (source) | affix (source) |
| ... | ... | ... | ... |

---

## Phase 3: Validation (automatic)

**Tool:** `bun app/simulate.ts --sweep --json`

**Input:** proposed platform + affix selections from Phase 2

**Output:** damage rankings confirming or challenging selections

For each slot in each variation:
```bash
bun app/simulate.ts --sweep --json --a "{platform}" --b "{default opponent}" --top 10
```

Check: is the selected affix pair in the top 10? If not, flag it.
The sim validates per-slot damage output, not cross-slot synergy (that's Phase 4).

---

## Phase 4: Analysis (reasoning)

**Tool:** Claude `sequential-thinking` MCP

**Input:** build table(s) from Phase 2 + context.json + sweep results from Phase 3

**Output:** full analysis following the structure of 剑九.md

### Template: Phase 4 Analysis Sections

Produce each section in order. Reference specific effect values from context.json.

#### 4.1: Assumptions

List progression tiers used for each book. Note any probability distributions
(e.g., 心逐神随's 4x/3x/2x split) with expected values calculated.

#### 4.2: Construction Philosophy

Explain the strategic principle behind this build. What is the core insight?
Examples from 剑九.md:
- Dual-channel principle (HP + SP pressure)
- Weapon support hybrid (clone doubling + self-damage)
- Route classification (not pure route 2, but hybrid)

Use context.json `nativeFunctions` to trace which slots serve which routes.

#### 4.3: Per-Slot Objectives

For each slot, produce a table:

| Component | Serves objective? | How |
|-----------|------------------|-----|
| main skill | ... | ... |
| 主词缀 | ... | ... |
| 辅位1 (source) | ... | ... |
| 辅位2 (source) | ... | ... |

End each slot with "Weapon service:" note explaining how this slot helps weapons.

#### 4.4: Dimension Coverage

Map each slot to a combat dimension:

| Dimension | Covered by | Weapon service | Gap? |
|-----------|-----------|---------------|------|
| Pressure/Counter | Slot 1 | ... | ... |
| Anti-defense | Slot 2 | ... | ... |
| Buff | Slot 3 | ... | ... |
| ... | ... | ... | ... |

Identify gaps (uncovered dimensions or expiring buffs).

#### 4.5: Effect Timeline

Use `timeSeriesVectors` from context.json to build a Gantt chart showing when
each effect is active. Format as a mermaid gantt diagram.

Key elements:
- Slot cast milestones at t=0, 6, 12, 18, 24, 30
- Effect duration bars (buff windows, DoT durations, permanent effects)
- Highlight: buff expiry gaps, overlap windows

#### 4.6: Slot-to-Slot Chains

For each adjacent slot pair (1→2, 2→3, 3→4, 4→5, 5→6), draw a mermaid flowchart
showing how effects from the earlier slot feed the later slot.

Example:
```
Slot 1 (clone 16s) →|"clone mirrors Slot 2"| Slot 2 (shield destroy)
Slot 3 (仙佑 +280%) →|"+280% atk buffs Slot 4"| Slot 4 (permanent debuff)
```

#### 4.7: Debuff Accumulation Model

If the build has a finisher that reads debuffs (e.g., 索心真诀), trace all debuff
sources by slot, whether they're still alive at finisher time, and stack counts.

Output: debuff count table at t=30 + damage calculation.

#### 4.8: Vulnerability Windows

Draw a Gantt chart of defensive coverage:
- When buffs are active (仙佑, 不灭魔体, etc.)
- When offensive pressure deters attackers (clone, counter)
- EXPOSED windows with no defensive coverage

Analyze each window: how dangerous is it, what mitigates it.

#### 4.9: Variation Comparison (if applicable)

If there's a Variation B, produce a comparison table:

| Dimension | A | B |
|-----------|---|---|
| Slot 1 main | ... | ... |
| Early fight | ... | ... |
| Late fight | ... | ... |
| Debuff count | ... | ... |
| Best against | ... | ... |

End with a matchup decision flowchart (mermaid) showing when to pick A vs B.

---

## Phase 5: Document Generation

**Tool:** Claude Write tool

**Output:** `data/books/{character}.md`

Compile all Phase 2 + Phase 4 outputs into a single markdown document following
the structure of `data/books/剑九.md`:

1. Style block (copy from 剑九.md or use `bun scripts/sync-style.ts`)
2. Assumptions (from 4.1)
3. Build table(s) (from 2.6)
4. Construction Philosophy (from 4.2)
5. Per-Slot Objectives (from 4.3)
6. Detailed Analysis per slot (raw data from context.json)
7. Effect Timeline (from 4.5)
8. Slot-to-Slot Chains (from 4.6)
9. Debuff Accumulation (from 4.7, if applicable)
10. Vulnerability Windows (from 4.8)
11. Variation Comparison (from 4.9, if applicable)

All mermaid diagrams must use the dark theme init block from CLAUDE.md.

---

## Tool Reference

| Tool | Command | When |
|:-----|:--------|:-----|
| Context generation | `bun scripts/construct-data.ts --character X --scenario Y` | Phase 1 |
| Function combos | `bun app/function-combos.ts --fn F_burst --platform X --top 5 --json` | Ad-hoc queries |
| Book vectors | `bun app/book-vector.ts --book X --json` | Ad-hoc queries |
| Sim sweep | `bun app/simulate.ts --sweep --json --a X --b Y` | Phase 3 |
| RAG query | `bun scripts/rag.ts --json "query"` | Ad-hoc queries |

## Quality Exemplar

The reference document for output quality is `data/books/剑九.md`. Every analysis
produced by this workflow should match its level of:
- Per-slot synergy tables with "serves objective?" column
- Cross-slot chain diagrams showing effect forwarding
- Debuff accumulation models with stack counts
- Vulnerability window analysis with defensive coverage gaps
- Variation comparison with matchup decision trees
