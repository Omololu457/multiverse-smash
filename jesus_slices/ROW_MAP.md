# Jesus sheet — row → game-state map (Step 1)
Slicer: tools/reslice_jesus.py (green-key + auto row-band). 27 bands in jesus_slices/jesus_row_NN.png.
"SPLIT" = tall band merging sub-rows (needs KOMA-style cut, like reslice_baki). "TRIM" = leading label text to crop.

| row | h | ~f | contents | → state | action |
|----:|--:|---:|----------|---------|--------|
| 0 | 96 | 4 | STAND label + 4 relaxed idle | idle | TRIM label |
| 1 | 57 | 8 | WALK label + 8-cycle | walk | TRIM label |
| 2 | 46 | 5 | walk-turn / lean | walk(turn) | |
| 3 | 54 | 6 | RUN lean cycle (+jump-start) | run | SPLIT jump-start |
| 4 | 47 | 11 | punch string + dash-punch blur | light combo | |
| 5 | 43 | 3 | downward chop/palm | heavy | |
| 6 | 129 | 3 | grab/uppercut reach + (below) slash-launcher | grab / launcher | SPLIT |
| 7 | 46 | 11 | palm-wind strikes + white wind-slash proj | palm attack + projectile FX | |
| 8 | 70 | 9 | stance + GOLDEN CLOUD frames | special: cloud (B+Up) | SPLIT |
| 9 | 49 | 5 | attack | (aux attack) | |
| 10 | 46 | 7 | fire-palm strikes + fire proj | special: fire (B+dir Right) | |
| 11 | 62 | 4 | jump-kick / aerial | air attack | |
| 12 | 45 | 5 | run + brown slash-trail kick | LAUNCHER (up-attack) | |
| 13 | 131 | 5 | combat-stance idle variant | idle2 / ready | SPLIT |
| 14 | 164 | 4 | attacks + x2 white slash | heavy / projectile | SPLIT |
| 15 | 61 | 5 | attack | (aux) | |
| 16 | 47 | 8 | attack | (aux) | |
| 17 | 177 | 7 | attacks + GREEN SHIELD bubbles + energy rings | special: shield + FX | SPLIT |
| 18 | 51 | 5 | attack | (aux) | |
| 19 | 80 | 11 | attack + shield spheres | (aux) + shield FX | SPLIT |
| 20 | 78 | 13 | attack row | (aux) | |
| 21 | 51 | 10 | DAMAGE: stagger→knockback | hurt / launched | |
| 22 | 93 | 8 | DAMAGE knockdown + OTHER MOVES (Rolling)+(Guarding) | knockdown / roll / block | SPLIT |
| 23 | 67 | 1 | (thin gutter) | — | drop |
| 24 | 272 | 9 | INTRO (cross→descend) + TAUNT + WIN(halo) | intro / taunt / win | SPLIT ×3 |
| 25 | 63 | 6 | (Final Smash) windup | ultimate cast | |
| 26 | 127 | 7 | Final Smash strike + escalating light circles | ultimate FX | SPLIT |

## Effect sprites (right column, separate export pass needed)
lion Walk/Roaring/Running · bread+crumbs · fire burst + fire-tornado · blue lightning · ice crystal · blue energy comet · green shield bubble · white cloud/tornado spirals · radiant light→sunburst (ultimate) · blood (EXCLUDED, heroic tone) · ~7 costume palettes (skins, later)

## Special/ultimate input plan (from sheet's own B-MOVES labels)
- B (neutral)      → LION summon/attack (r?; lion cycles on right)
- B + Right        → FIRE projectile (r10)      | B + Left → LIGHTNING projectile (right-col FX)
- B + Up           → CLOUD rise / anti-air (r8)
- B + Down         → ROAR AOE, damage + LIFESTEAL heal (right-col frames + text)
- (aux, no B-label on sheet — flagged) BREAD projectile, SHIELD barrier
- Ultimate         → BLESSED ENERGY burst (r25/26 + radiant light)  — high cost, high dmg, top-tier
