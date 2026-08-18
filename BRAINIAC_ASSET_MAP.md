# BRAINIAC — Asset Map (Stage 0, verified against real art)

Source: 13 row strips `brainiac_row_01.png` … `brainiac_row_13.png`, all 661px wide,
heights 82–160px. Green-skinned Brainiac in purple/grey armor; metallic segmented
tentacles from the shoulders; cyan energy beams. Visual audit done frame-by-frame
2026-08-17 — this supersedes the tentative build-prompt readings.

## Per-row verified content

| Row | px H | What the pixels actually show |
|---|---|---|
| 01 | 88  | **IDLE** front-facing (3f) · **[REF] helmet/skull icon + blue line** (1f, HUD/ability icon) · **WALK** forward loop (6f) · **[REF] turnaround** (2f) |
| 02 | 82  | **BEAM (primary)** — stance → charge orb → arm-extend fire → recharge → fire (5f). Horizontal arm beam, cyan. Self-contained. |
| 03 | 93  | **ENERGY BLADE** — stance → crouch → charge orb → release *angled/elongated* cyan blade-beam pointing down-forward (5f) · **READY STANCE** combat-ready (2f). Blade is visibly angled vs row_02's straight beam. |
| 04 | 108 | **TENTACLE SWEEP** — self-contained: coiled → extend long whip to the side → retract → splay → coil (5f). Horizontal reach; distinct *angle* from row_09's forward spear. |
| 05 | 111 | **TENTACLE extend alt** (2f, subset of row_04) · **LEVITATION** — stands on glowing blue energy disc, final frame fires a beam while hovering (ends on launch pose). |
| 06 | 105 | **TENTACLE GUARD/hold** — coiled + minor motion + small charge (4f) · **KNOCKDOWN (light)** — hit → fall/recovery (3f, gets up). |
| 07 | 128 | **ELECTRIC SHIELD** — body wrapped in crackling blue electric arcs (3f, defensive/buff, NOT a beam) · **TENTACLE EMERGE** — tentacles unfurl from shoulders into stance (3f). |
| 08 | 95  | **DEATH/KO** — full sequence: stagger → bend → fall → lie on ground → roll → rise (6f). The complete knockdown+getup. |
| 09 | 130 | **TENTACLE WHIP (windup/thrust)** — contracted → extend → full forward spear → spread (4f). Primary offensive tentacle. |
| 10 | 120 | **TENTACLE WHIP (payoff)** — multi-directional fan: crossed / splayed / symmetrical fan patterns (4f). Pairs after row_09. |
| 11 | 108 | **QUICK BEAM** charge→fire (2f, subset of row_02) · **IDLE** (3f — DUPLICATE of row_01 idle) · **TENTACLE EMERGE** (2f — DUPLICATE of row_07 emerge). |
| 12 | 128 | **BEAM firing pose** (1f) + **beam VFX strip** (2f) — shared active-frame/FX for the beam · **CROUCH idle** (2f) · **TENTACLE CROUCH** (2f). |
| 13 | 160 | **VFX LIBRARY** — 9 vertical cyan energy pillars/columns, varied width/height, several with splash-impact bases. Reads as vertical columns, not horizontal arm-beams. |

## Stage 0 reconciliations (RESOLVED against art)

- **Duplicate idle** → CONFIRMED same animation. Canonical = **row_01** idle; row_11 idle discarded.
- **Tentacle group (8 entries → survivors):**
  - **row_09 → row_10** = Tentacle Whip (windup spear → multi-dir fan). *Most confidently distinct.* KEEP.
  - **row_07-emerge → row_06-hold** = Tentacle Guard/buff stance (enter → hold). KEEP. row_11-emerge is a DUPLICATE of row_07-emerge → discard.
  - **row_04** = Tentacle Sweep (horizontal side-whip). Visually distinct *angle* from row_09. **CANDIDATE-DISTINCT** — owner decision (build as 2nd tentacle special vs fold as redundant). row_05-1 extend = subset → fold.
  - **row_12-tentacle-crouch** = crouch-context pose, not a standalone special (project has generic crouch-variant hook).
- **Beam group (5 entries → survivors):**
  - **row_02** = Beam (primary). KEEP. Firing pose/FX from row_12; projectile/impact from row_13.
  - **row_03** = Energy Blade (angled). **CANDIDATE-DISTINCT** — genuinely angled differently from row_02; owner decision (distinct special vs dup).
  - **row_11-quickbeam** = subset of row_02 → fold (light variant) or discard.
  - **row_07-1 Electric Shield** = defensive buff/counter, KEEP SEPARATE (not offensive).
- **row_13 pillars** → vertical columns, ambiguous role: beam/impact FX *or* a distinct "Energy Pillar" AoE (strong ULT candidate). Owner decision.
- **Knockdown vs Death** → CONFIRMED distinct. row_08 (6f complete fall+getup) = canonical knockdown; row_06-2 (3f) = lighter stagger reaction.
- **Levitation (row_05-2)** → only 3–4 disc frames, NO glide-movement art → NOT persistent flight (unlike Onoki). Resolves as **one-off special** (rise + aerial beam / reposition).
- **Reference-only excludes** → row_01 skull icon (HUD) + row_01 turnaround (2f). Portrait NOT from icon — derive bust from idle frame0 (project standard).

## Confirmed GAPS (not to be invented)

- **No normal-tier art** anywhere (no jab/poke/basic strike). Real gap → design decision.
- **No Ultimate, portrait, win-pose, or intro art.** Portrait = idle bust. Ult/win/intro = owner decision / procedural fallback.

## Provisional kit size (post-reconciliation)

Solid: Beam · Electric Shield · Tentacle Whip · Tentacle Guard stance · Levitation.
Candidates: Energy Blade (row_03) · Tentacle Sweep (row_04) · Energy Pillar (row_13).
→ Large all-special zoner/turret (Madara/Onoki/Saitama schema-exception class). No normals unless repurposed.
