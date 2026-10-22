# Spider-Man — Phase 1 Ledger (Inventory of the CPS2 sheet)

**Source:** `assets/source/spiderman_original.gif` — Arcade Marvel Super Heroes
(Capcom CPS2), ripped by **Alvin-Earthworm** (credit in `docs/ASSET_CREDITS.md` +
`credits.js`). 1690×4748, green background **#008000** (0,128,0) — the prompt said
≈#00A000; the true value is #008000, keyed on the detected value. MD5
`fdcd21dfc385307d5f74fb9f91498bad`.

**Machine-readable twin:** `assets/source/spiderman_inventory.json`.
**Contact sheet (3×, labelled):** `assets/source/spiderman_contact_sheet_3x.png`.

## ⚠️ Key finding — this is a REVIVE, not a greenfield build

A near-complete Spider-Man already existed in the repo (`characters.js const spiderman`,
`abilities.js` web-swing/specials/ult, `game.js` drivers, `spidermanVoice.js`, skins,
credits, harnesses) but was in `_WIPED_FOR_REDO` **solely because the sprite art had
never been generated**. The attached sheet is the exact one the prior build was designed
against — its `animationData` comments cite these rows. Conservative action (per
"take the conservative option, log it, continue"): **revive the canonical `spiderman`**
by generating the missing art from this sheet via the intact project pipeline
(`spiderman_sliced/` row strips + `tools/reslice_spiderman.py`), then un-wipe. The
generated sheets' frame counts/cell dims match the committed `animationData` **exactly**.

## Row → utilization (every one of the 27 rows accounted for — target: zero unused)

| Row | Content | Status | Used for | Sheet(s) |
|----:|---------|--------|----------|----------|
| 01 | crouched-stance breathing loop | USED | idle | `spiderman_idle_uniform.png` (10f) |
| 02 | crouch-to-stand | USED | intro (introPool→idle) | `spiderman_intro_uniform.png` (12f) |
| 03 | jump arc (serpentine, Start/Land boxes) | USED | jump=top rise / fall=bottom tumble→dive | `spiderman_jump_uniform.png` (10f), `spiderman_fall_uniform.png` (11f) |
| 04 | punch combo + rising spin-kick | USED | light=punch / heavy=spin-kick launcher | `spiderman_light_uniform.png` (5f), `spiderman_heavy_uniform.png` (6f) |
| 05 | aerial spin combo | USED | up=reach-spin launcher / air=curled spin | `spiderman_up_uniform.png` (5f), `spiderman_air_uniform.png` (5f) |
| 06 | aerial tumble poses | RESERVE | banked (future air strings) | — |
| 07 | bracketed walk loop | USED | walk (+run) — `[ ]` bracket mark scrubbed | `spiderman_walk_uniform.png` (8f) |
| 08 | crawl + forward roll | USED | rollForward | `spiderman_rollf_uniform.png` (7f) |
| 09 | low all-fours crawl loop | USED | spiderCrawl (Ground Crawl) | `spiderman_crawl_uniform.png` (7f) |
| 10 | handstand kick-up + prone | USED | spiderKickup (crawl exit) | `spiderman_kickup_uniform.png` (5f) |
| 11 | Jump Attack Combo (leap→spin) | USED | spiderCombo (Fwd+Heavy cmd normal) | `spiderman_cmdchain_uniform.png` (9f) |
| 12 | diving spin | USED | down_air (spike) | `spiderman_downair_uniform.png` (5f) |
| 13 | extra strip | RESERVE | unassigned | — |
| 14 | extra strip | RESERVE | unassigned | — |
| 15 | aerial tumbles + fanning web-net | USED | spiderWebBridge (bottom band) | `spiderman_webbridge_uniform.png` (5f) |
| 16 | web windup + impact-puff FX | USED | spiderWebImpact cast + web-puff FX | `spiderman_webimpact_uniform.png` (6f), `spiderman_webpuff_uniform.png` (4f) |
| 17 | big web-net FX + throw poses + angled web-lines | USED (partial) | Maximum Web ULT FX (top band). Angled web-lines → **Phase 2** | `spiderman_maxweb_uniform.png` (8f) |
| 18 | Web Throw (windup→line→web-ball) | USED | spiderWebThrow cast + web-ball FX | `spiderman_webthrow_uniform.png` (1f), `spiderman_webball_uniform.png` (1f) |
| 19 | web retraction + reaction | RESERVE | covered by row 18 | — |
| 20 | speed-trail dash + spin-punch | USED | dash (blur) / spiderDashAttack (Back special) | `spiderman_dash_uniform.png` (1f), `spiderman_dashatk_uniform.png` (6f) |
| 21 | extra strip | RESERVE | unassigned | — |
| 22 | backward roll | USED | rollBack | `spiderman_rollb_uniform.png` (6f) |
| 23 | dash→handstand→flip kick | USED | spiderHandstand (Up special launcher) | `spiderman_handstand_uniform.png` (10f) |
| 24 | glow-FX victory pose | USED | win + taunt + **portrait** (frame 2 bust) | `spiderman_win_uniform.png` (11f), `spiderman_portrait.png` |
| 25 | crouch/getup + chain-hang + reaching lunges + point-taunt + white/blue figure | USED (partial) | **spiderSwing** = reaching lunge (x671-759, NEW this phase). Rest → Phase 2/3 | `spiderman_swing_uniform.png` (1f) |
| 26 | idle taunt variant | RESERVE | banked secondary taunt | — |
| 27 | idle taunt variant | RESERVE | banked secondary taunt | — |

**26 `*_uniform.png` action/FX sheets + `spiderman_portrait.png` produced, all referenced
by `spiderman.animationData` or the kit code (zero dangling references).**

## Annotations read, then EXCLUDED (never rendered)

- **Black group boxes** `Start` / `Land` (around the row-03 acrobatic arc) — rectangle
  outline + label text; avoided with explicit `xrects` so only the character frames cut.
- **Black loop brackets `[ ]`** (e.g. row-07 walk) — removed per-cell by
  `scrub_isolated()` (small + thin + mostly-black component; never a body part). Web-FX
  sheets are exempt from scrub so their thin strands survive.
- **Motion arrows** (travel direction on the arc) — not part of any cut frame.
- **Credit box** (648,4562)-(1163,4729) — attribution only; **never rendered**
  (credited in `docs/ASSET_CREDITS.md`).

## NOT Spider-Man — EXCLUDED (not used, not built as characters)

- **Dinosaur / creature** figure (lower-right creature panel).
- **Venom-like blue figure** (bottom-right ~x1500,y4500).
- **Dinosaur bubble** "There's something really bad behind me, huh?" (1068,2182)-(1345,2351)
  — belongs to the creature panel; **not used**.

## Speech bubbles — CUT clean (with tail) as transparent sprites → `spiderman_quips/`

| Sprite | Text | Phase-3 role |
|--------|------|-------------|
| `spiderman_quip_taunt.png` | "Does this outfit make me look fat?" | big TAUNT bubble |
| `spiderman_quip_hey.png` | "HEY!" | auto quip (small) |
| `spiderman_quip_dojob.png` | "DO YOUR JOB!" | auto quip (small) |
| `spiderman_quip_cmonpal.png` | "C'MON PAL!" | auto quip (small) |
| `spiderman_quip_ohyeah.png` | "Oh yeah? Well my dad is bigger than your dad, so nyeh!" | **reclaimed** round-win quip (only the bubble reused; the Venom figure it belonged to is excluded) |

## Deferred / banked for later phases (located now, cut in the phase that needs them)

- **row-17/18 angled web-line sprites** (shallow/steep/vertical/horizontal strands + anchor
  tip) → Phase 2 swing/zip/grapple line art (line is currently code-drawn).
- **row-25 chain-hang** (2 upside-down web-hang frames) → Phase 2 ceiling-hang tier candidate.
- **row-25 white/blue negative-palette figure** → Phase 3 Spider-Sense flash + alt-costume skin.
- **dark purple silhouette** crouched figure → Phase 3 Ultimate cinematic opener (precise cut deferred).
- **rows 26/27** secondary taunts; **rows 06/13/14/19/21** unassigned aerial/extra strips.

## Confirmed content gap (honest — no invented art)

**No hit-reaction / knockdown / getup frames exist anywhere on the sheet.** Ships NO
hurt/knockdown/getup strips → the engine renders the safe idle-pose fallback + the
procedural hit flash/shake. The Stage-1 harness proves the fallback is the idle pose,
not a 128×128 procedural box.
