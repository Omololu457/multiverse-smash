# naruto_seventh — H-sheet LEDGER (padakun JUS, 1344×4616, navy 0,64,128)

Status key: **USED** (wired this phase) · **OPT-IN** (sliced/planned, default-off or later phase) · **UNUSED** (reason).
All frames keyed via border flood-fill (tol 40); the interior-navy Bijuudama sphere is preserved by edge-flood.
Sheet-map y's drift ~115px low in the mid/lower sheet — bands below are the VERIFIED keyed-scan y-ranges.

| H section (label) | keyed y-band | frames | status | where / reason |
|---|---|---|---|---|
| Title "NARUTO HOKAGE JUS" | 34–196 | — | UNUSED | title/credits text (TRAP: excluded) |
| Color Paletes | 205–292 | 6 | OPT-IN | BASE-only recolor skins → **PHASE 4** |
| Intro + hat Fx | 324–412 | 4 (+2 Fx) | USED | `intro` (robe/hat reveal). The 2 bracketed hat-Fx frames = OPT-IN (not wired) |
| Stance | 444–532 (x<420) | 8 | USED | `idle` |
| Dash | 444–532 (x>420) | 3 | USED | `dash` |
| Run | 589–638 | 6 | USED | `run` + `walk` (slowed) |
| Jump | 695–757 (x<366) | 5 | USED | `jump` + `fall` |
| Guard | 695–757 (x>366) | 2 | USED | `guard` |
| Damage (row 1) | 816–877 | 7 | USED | `hurt` (plays first 3 stagger frames) |
| Damage (row 2) | 890–929 | 4 | USED | `getup` (frame 0 = `knockdown`/defeat hold) |
| Attack Combo 1 (3 strings) | 989–1193 (x<312) | 9 | USED | `light` |
| Attack Combo 2 (golden KCM) | 989–1193 (x>315) | 12 | OPT-IN | KCM Light → **PHASE 3** |
| Combo 1 Air | 1208–1456 (x<312) | 9 | UNUSED | multi-row mixes with golden Combo-2-Air; `air` used instead. OPT-IN for a later air-combo pass |
| Combo 2 Air (golden) | 1208–1456 (x>315) | 12 | OPT-IN | KCM Air → **PHASE 3** |
| Chakra Charge | 1516–1573 | 4 | USED | `n7Charge` cast pose (KCM transform anim → **PHASE 3**) |
| Throw Weapon | 1631–1691 (x<238) | 3 | USED | `n7Throw` (Down+Special) |
| Throw Weapon (air) | 1631–1691 (x>240) | 3 | USED | `n7ThrowAir` |
| Strong Attack | 1748–1801 | 5 | USED | `heavy` |
| Forward (Strong Fwd) | 1852–1908 | 4 | OPT-IN | `n7StrongFwd` pose sliced; no Fwd+Heavy command-normal wired yet |
| Down (RED FLAME) | 1963–2041 | 6 | USED | `n7StrongDown` pose sliced. Red-flame dmg/hitbox bonus → **PHASE 2** (Bond 1) |
| Up (RED FLAME) | 2099–2172 | 6 | USED | `up` (up-attack launcher). Red-flame bonus → **PHASE 2** (Bond 1) |
| Strong Attack Air | 2230–2290 | 5 | USED | `air` + `down_air` |
| Sp1 Doton (body) | 2340–2400 (x<300) | 4 | USED | `n7Doton` (Back+Special) |
| Sp1 Doton (pillar FX) | 2340–2400 (x>372) | 6 | USED | `naruto_seventh_doton_pillar_uniform.png` — the rising wall |
| Sp2 Rasengan (ground) | 2452–2516 (x<315) | 5 | USED | `n7Rasengan` (Neutral+Special). Ball = code-drawn FX |
| Sp2 Rasengan (air/dive) | 2452–2516 (x>340) | 5 | USED | `n7RasenganAir` (air Neutral+Special) |
| Sp3 Rasenshuriken (ground) | 2570–2634 (x<315) | 5 | USED | `n7Rsk` (Fwd+Special). Disc = code-drawn FX |
| Sp3 Rasenshuriken (air) | 2570–2634 (x>340) | 5 | USED | `n7RskAir` |
| Sp4 Oiroke (gag) + heart Fx | 2667–2752 | ~6 | OPT-IN | Oiroke no Jutsu toggle (default OFF) → **PHASE 4** |
| stray yellow/purple line | ~2667 (x 1100–1325) | — | UNUSED | TRAP (right of Special 4) — excluded |
| Sp5 Four-Tails (4 rows) | 2810–3105 | ~40 | OPT-IN | Four-Tails Rampage (U+Special, Bond 2+) → **PHASE 2** |
| Sp6 Rikudou (black/gold) | 3159–3303 | ~26 | OPT-IN | Rikudou apex (KCM Down+Ult, Bond 4) → **PHASE 4** |
| Sp7 Rasenkyugan (KCM) | 3364–3502 | ~14 | OPT-IN | KCM Neutral+Special → **PHASE 3** |
| Sp8 Wakusei Rasengan (KCM) | 3563–3647 | ~12 | OPT-IN | KCM Fwd+Special → **PHASE 3** |
| Sp9 Air Bijuudama + Kurama heads + sphere | 3680–3867 | 3 (+FX+sphere) | OPT-IN | KCM Bijuudama ultimate → **PHASE 3** |
| Sp10 Kuchiyose (seal) | 3947–4033 | 6 | USED | `n7Kuchiyose` (Gamabunta summon cast pose) |
| GAMABUNTA (4 large) | 4065–4236 | 4 | USED | Gamabunta ultimate (`naruto_seventh_gamabunta_uniform.png`) |
| Win frame 1 (base) | 4276–4369 (x<96) | 2 | USED | `win` (base pose) |
| Win frame 2 + golden burst/ring FX | 4276–4455 | — | OPT-IN | base→golden KCM transform + win → **PHASE 3** |

## Code-drawn FX (ART RULE 3 — sheet carries no art)
1. **Rasengan sphere** — `ui.drawProjectiles` drawKind `"rasengan"` (swirling blue chakra ball). The hand is empty on the H thrust frames.
2. **Rasenshuriken disc** — drawKind `"rasenshuriken"` (spinning 4-blade wind shuriken). Sheet shows the throw pose only.
3. **Rikudou entry flash** — deferred to **PHASE 4** (code-drawn gold burst), per spec.
(Doton pillars + Gamabunta + Kuchiyose seal all use their OWN in-sheet art — NOT code-drawn.)

## Engine-level effects used
- Kunai (Throw Weapon) reuses the existing shared `"kunai"` drawKind.
- Camera shake on casts/slash; invuln i-frames on Gamabunta cast.

## NOT BUILDABLE (reported)
- **Bijuu Rasenshuriken** — no KCM frames exist for it on H (confirmed). Will remain unbuilt.

## Mode-capability note (PHASE 1 = BASE only)
Only BASE (orange Hokage-robe) sections are wired. KCM-golden, red-flame-bonus, Four-Tails, and Rikudou
sections are sliced/identified but gated to their later phases — so **no frame crosses modes** this phase.
