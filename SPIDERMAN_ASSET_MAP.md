# Spider-Man — Asset Map (Marvel Super Heroes, Capcom CPS2 arcade rip by Alvin-Earthworm)

rosterKey `spiderman` · universe `marvel` (FIRST) · energyType `web_fluid` ("Web Fluid") · HP1080/EN180/atk88/def80/spd96 · scale 1.1.
Source = 27 numbered `spiderman_row_NN.png` strips + `spider man/Arcade - Marvel Super Heroes - Fighters - Spider-Man.gif`.
Resliced feet-aligned by `tools/reslice_spiderman.py` (band/keep/pick/xrects + `even()` for touching-frame strips). Row originals kept untouched.

## Row → action utilization

| Row | Content | Used for | Sheet |
|-----|---------|----------|-------|
| 01 | crouched-stance breathing loop | idle | spiderman_idle_uniform.png |
| 02 | crouch-to-stand transition | intro (introPool, plays once → idle) | spiderman_intro_uniform.png |
| 03 | jump arc (SERPENTINE multi-band, Start/Land boxes) | jump = TOP band rise / fall = BOTTOM band tumble→dive | spiderman_jump_uniform.png, spiderman_fall_uniform.png |
| 04 | 5-frame punch combo + rising spin-kick | light = punch (even-split) / heavy = spin-kick launcher (xrects) | spiderman_light_uniform.png, spiderman_heavy_uniform.png |
| 05 | aerial spin combo | up = f1-4 reach-spin launcher / air = f4-8 curled spin | spiderman_up_uniform.png, spiderman_air_uniform.png |
| 06 | (aerial tumble poses) | — reserve | — |
| 07 | bracketed walk loop | walk (run reuses walk) | spiderman_walk_uniform.png |
| 08 | crawl loop + roll | rollForward (roll region, even-split) | spiderman_rollf_uniform.png |
| 09 | crawl loop + roll recovery | spiderCrawl (Ground Crawl loop, even-split) | spiderman_crawl_uniform.png |
| 10 | handstand kick-up + prone | spiderKickup (crawl exit launcher) | spiderman_kickup_uniform.png |
| 11 | Jump Attack Combo (leap→spin) | spiderCombo (Fwd+Heavy command normal, even9-split) | spiderman_cmdchain_uniform.png |
| 12 | diving spin | down_air (spike) | spiderman_downair_uniform.png |
| 13 | (extra strip) | — reserve | — |
| 14 | (extra strip) | — reserve | — |
| 15 | aerial tumbles + BOTTOM fanning web-net | spiderWebBridge (bottom band = combo-cancel + ult cast pose) | spiderman_webbridge_uniform.png |
| 16 | web windup + impact-puff FX | spiderWebImpact cast + web-puff projectile FX | spiderman_webimpact_uniform.png, spiderman_webpuff_uniform.png |
| 17 | multi-band: big web-net FX + throw poses + angled web-lines | **TOP band = Maximum Web ULT FX** (8 growing web-net frames) | spiderman_maxweb_uniform.png |
| 18 | Web Throw (windup→line→web-ball) | spiderWebThrow cast + web-ball projectile FX | spiderman_webthrow_uniform.png, spiderman_webball_uniform.png |
| 19 | web retraction + reaction | — (covered by 18) | — |
| 20 | speed-trail dash + spin-punch | dash = leftmost blur (1f) / spiderDashAttack = spin-punch (Back special) | spiderman_dash_uniform.png, spiderman_dashatk_uniform.png |
| 21 | (extra strip) | — reserve | — |
| 22 | backward roll | rollBack | spiderman_rollb_uniform.png |
| 23 | dash→handstand→flip kick | spiderHandstand (Up special launcher) | spiderman_handstand_uniform.png |
| 24 | glow-FX victory pose | win (auto-plays victory screen) + taunt | spiderman_win_uniform.png |
| 25 | crouch/getup + CHAIN-HANG + point-taunt + **white/blue alt-costume** | — see BANKED/DEFERRED | — |
| 26 | idle taunt variant (point/taunt) | — banked (secondary taunt) | — |
| 27 | idle taunt variant | — banked (secondary taunt) | — |

Portrait: `spiderman_portrait.png` — hands-on-hips heroic bust cropped from the row_24 victory pose (idle is crouched → poor bust).

## CONFIRMED CONTENT GAP (honest, no invented art)
- **No hit-reaction / knockdown / getup frames exist anywhere.** Ships NO hurt/knockdown/getup strips → the engine's safe missing-action fallback renders his own idle pose + the procedural hit flash/shake (Jason precedent).

## BANKED for the future SKINS batch
- **row_25 white/blue alt-costume** — REAL, pre-drawn palette-swap costume (a genuine skin candidate, same precedent as Hiruzen's color_palletts / Yamamoto's palette-header rows). Plus standard creative recolors.

## DEFERRED / reserve (sliced-able if later stages need them)
- row_25 CHAIN-HANG pose — decorative swing-rig leftover, NOT a combat move (Stage 0 finding — do not build into gameplay).
- rows 26/27 secondary idle-taunt variants — banked as extra taunt options.
- rows 06/13/14/21 — unassigned aerial/extra strips.

## FOLLOW-UPS (separate future passes)
- Skins batch (row_25 alt-costume + creative recolors + an Alien-X Void).
- Voice (no source clips located yet).
