# MSV1-CLONES — frame-data changes

**Everyone outside the five: ZERO change.**
- characters.js / kits / skins untouched; `msv1_framedata_diff` + `msv1_merge_framediff`: every existing character byte-identical.
- Shane / Dustin (ns_red / ns_yellow): the clone engine moved from ninja.js to clonechoreo.js — a 128-frame clone-job trace per
  form is identical before vs after (`harness/msv1_clones_trace.mjs`), both forms' frame-data diff = 0 fields.
- Jiraiya / Kakashi / Minato (same generic engine, no style): a full clone move with the choreography ON vs OFF is byte-identical
  (`harness/msv1_clones.test.mjs`), and no clone FX events fire.

**The five: one change only — a lead-in in front of every authored clone sequence** (hand sign + ring → pop → staggered fan-out
→ hold). Every hit, finisher, i-frame window and the end of the move shift by the same `lead`; damage, hit count, clone count,
inputs, cost and cooldown are unchanged (measured: same damage per hit, every hit exactly +lead).

| Character | Lead (= caster commitment +) | Sequences affected |
|---|---|---|
| Naruto | **+10** | Uzumaki Barrage 78→88, Two Thousand 92→102, Shadow Clone Shuriken 58→68, Substitution Escape 40→50, Clone Flank Strike 56→66 |
| Sasuke | **+6** | Amenotejikara 40→46 (teleport + i-frames at 6→12, hit 20 unchanged) |
| Madara | **+12** | Susanoo Wood Rise 86→98, Wood Dragon Coil 56→68, Great Fireball Volley 58→70, Gunbai Guard 40→52, Wood Clone Feint 44→56, Perfect Susanoo 104→116 |
| Tobirama | **+12** | Water Clone Barrage 78→90, Water Prison Seize 58→70, Water Dragon Volley 58→70, Water Clone Guard 40→52, Instant Revolving Swap 44→56, Great Waterfall Swarm 92→104 |
| Hashirama | **+12** | Wood Clone Onslaught 96→108, Deep Forest Emergence 64→76, Wood Pillar Barrage 60→72, Wood Clone Bulwark 42→54, Wood Clone Feint 46→58, Deep Forest Bloom 100→112 |

All within the +12 limit. Worth knowing: the defensive escapes (Substitution Escape, Water Clone Guard, Gunbai Guard,
Wood Clone Bulwark, the two Feints, Amenotejikara) now give their i-frames `lead` frames later — the same +lead as everything else.

**No timing change** (presentation only): the staged clone formations (Naruto 4 / 8 / 12, generic 4 / 8 — the clones now pop at the
caster and fan out to their formation spots inside the same 90-frame select window); the persistent "," clones (Tobirama rises out of
water, Hashirama grows, Madara pops in dark smoke and leaves through dark smoke instead of wood logs — same 16-frame hidden spawn);
the one-shot "h" moves (untouched).
