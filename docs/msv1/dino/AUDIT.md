# MSV1-DINO — Phase 0 audit

Start commit: see `START_COMMIT.txt` (ab43fdb97). HEAD moved to a71c422d9 (another session's "OG CPUs fight harder") before the
first Dino commit; every Dino commit is built on the then-current HEAD (private index, only Dino paths + hook lines).

## Existing Dino Rangers
`git grep -i "dino_|dinothunder|dino thunder"` over every tracked `*.js` at HEAD: **none**. No Dino Thunder character, skin,
asset folder or test existed, so nothing was left untouched or renamed. The five sheets were not in `assets/incoming/dinothunder/`
(the folder did not exist); they were found in `~/Downloads` dated today ("Red Ranger.gif", "Blue Ranger.png", "Yellow Ranger.png",
"White Ranger.png", "Drago Ranger.png"; the two Red gifs there are byte-identical) and copied in unchanged.

## What is reused (nothing forked)
| piece | module | how |
|---|---|---|
| S.P.D. Red foundation | `rangers.js` (via `ninja.js registerNinjaProfile`) | the same double-tap detector (tapWindow 12), run ×1.5, ranger badge / morph; numbers in `SPD_RED_REFERENCE.md` |
| form framework | `ninja.js` profiles + `registerDuo` | four hidden profiles `dt_red / dt_blue / dt_yellow / dt_white`; the live `rosterKey` is the active form (the NS Trio / MSV1-MERGE pattern) |
| gem energy | ninja.js Ninja Power | 0–100, start 50, regen 6/s, +4 per hit — the framework defaults are exactly the brief's numbers |
| Dino Dash | ninja.js streak | per-form `streak` blocks (distance, intangible frames, air per-airtime) + two gated hooks (armor, Red's chain gate) |
| Drago Clone | ninja.js Mirror (echo mode) | echoDelay 12, 6 s, 50 % / no KO, counter = one 50 hit; `fixedReal` keeps Trent in place (no hidden identity) |
| command layer | `ninjaCommand.js` | duo command first (swap / Super Dino / Z-Rex), then the profile's specials table |
| render | `nsFx.js` | strips in MSV1 cells; illusion / HUD / burst / cue hooks delegate to `dinoFx.js` for this fighter only |
| CPU | `ai.js` chain | `dinoAiInput` presses the same hold-P + J/K/L/O / P-P keys a player does |

## The SWAP input vs Ben 10's real input
| | Ben 10 (live, `game.js` / `fighters.js`) | Dino Thunder Rangers (this build, the brief's input) |
|---|---|---|
| gesture | **↓↓ then ONE button**: a 2nd ↓ within `OMX_DOUBLE_TAP_WINDOW` = 16 f arms the dial, then J / K / L / O / P within `OMX_ARM_WINDOW` = 18 f picks slot 1–5, `;` reverts | **hold P, then J / K / L / O** = Red / Blue / Yellow / White directly; **double-tap P** (2nd P within 16 f, Ben's window) = the next Ranger |
| cost / lockout | `TRANSFORM_ENERGY.SWAP_COST` = 10 (15 under a vow), 30-frame lockout | 15 gem, 90-frame cooldown, 14-frame swap with 6 invulnerable frames |
| buttons while arming | the slot button is consumed | J / K / L / O under a held P are ALWAYS consumed (never attack), even when the swap is refused |
| directions | ↓↓ is the trigger | not used; ↓↓ + P stays Trent's Drago Clone (a P press with a direction never counts as half a double-tap) |
| plumbing | Omnitrix dial in game.js | the raw InputFrame (`dinothunder.js input`), so replay / LAN / rollback carry it unchanged |

`MSV1_WORLD.benSwap()` exposes Ben's live numbers; the Dino swap borrows only the 16-frame double-tap window from it.

## P2 and gamepad
| action | P1 keyboard | P2 keyboard | pad |
|---|---|---|---|
| call Red / Blue / Yellow / White | hold P + J / K / L / O | hold 7 + 1 / 2 / 4 / 6 | hold L2 + □ (Light) / △ (Heavy) / R1 (Special) / L1 (Grab) |
| next Ranger | P P | 7 7 | L2 L2 |
| Super Dino Mode | ↓↓ + L + K | ↓↓ + 4 + 2 | ↓↓ + R1 + △ |
| Drago Clone (Trent) | ↓↓ + P | ↓↓ + 7 | ↓↓ + L2 |
| Z-Rex Blaster | U (full meter) | the P2 Ultimate key | Ultimate (button 7) |

The pad rows come from the same raw snapshot (`input.js` pad list now includes `dt_*`), so the pad is not a separate parser.
