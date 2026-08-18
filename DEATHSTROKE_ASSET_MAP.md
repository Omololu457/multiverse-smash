# DEATHSTROKE — Asset Map / Stage 0 Pixel Audit

Source: 11 wide strips `deathstroke_row_01.png` … `deathstroke_row_11.png`, all 1028px wide,
RGBA. Verified frame-by-frame at 2× (this is a real pixel audit, not a re-read of the build
prompt). Character: Slade Wilson / Deathstroke — grey bodysuit, orange accents, orange/black
two-tone mask, katana sheathed diagonally on back, sidearm pistol.

## Per-row confirmed content

| Row | px (w×h) | Confirmed content (left→right) |
|---|---|---|
| row_01 | 1028×95 | **idle + walk** cycle (~9 humanoid frames, sword sheathed on back) → **crouch** (2 low frames, sword drawn low) → **portrait** (orange/black mask bust icon) → **"DEATHSTROKE" title card** (text, not animation) |
| row_02 | 1028×96 | **melee punch/jab combo** (~9f: guard → jab extension → cross → lunge thrust → guard reset). A short off-hand blade appears mid-string but it reads as an unarmed melee normal string. |
| row_03 | 1028×111 | **jump (rising)** ~4f (knees tuck, vertical) + **jump-slash** overhead sword raise ~3f + **crouch/stab** low forward thrusts ~5f |
| row_04 | **1028×206 (DOUBLE ROW)** | TOP: **aerial spin/tumble**, sword drawn mid-flip, full rotation incl. upside-down frames (~9f). BOTTOM: **roundhouse / spin kick**, crouch → windup → high leg extension → recovery (~9f) |
| row_05 | 1028×92 | **hit-react / stagger-fall** ~5f (knocked back → prone) + **gun attack (standing)**: holds a real **teal pistol**, aims & fires forward, ends in a low/falling pose (~5-6f) |
| row_06 | 1028×97 | **jump (alt)** forward lunging leap, arm out (~5f) + **death / KO**: fall → tumble → lie flat (~8f), with a few **getup/rise** frames at the far right |
| row_07 | 1028×117 | **sword slash** — overhead raise → windup → horizontal forward slash w/ large grey motion-trail arc (6f) |
| row_08 | 1028×93 | **sword slash (draw & cut)** — draws from low, off-hand dagger, sweeping slash w/ trail (~8f) |
| row_09 | 1028×86 | **sword slash (overhead spin finish)** — full circular spin trail → ends **sword re-sheathed** (6f). Reads as a finisher/ender. |
| row_10 | 1028×106 | **run** sprint cycle ~6f + **running slash** diving forward lunge w/ trail ~2f + **turnaround** reference (front + rotation poses, no weapon) ~4f |
| row_11 | 1028×104 | **sword ready / draw-to-stance** ~5f (reach → raise overhead → bring blade to a held guard stance) + **idle rotation reference** unarmed, multiple angles ~5f |

## Excluded from runtime atlas (reference/doc content)
- row_01 title-card text ("DEATHSTROKE") — not animation. **Portrait bust carved out separately** → HUD/select asset.
- row_10 item 3 — 4-frame turnaround reference.
- row_11 item 2 — 5-frame unarmed idle-rotation reference.
- (No standalone gun-aim reference frame was found in row_01; the gun attack is fully self-contained in row_05 with a real drawn pistol.)

## Resolved-by-pixels (no owner input needed; flagged, reversible)
- **idle/walk boundary (row_01):** two sub-clips inside the 9 frames — resolve exact split at reslice by foot-position (early frames = weight-shift idle, later = striding walk). Not an even split assumption.
- **two jumps:** row_03 jump = neutral *vertical* rise; row_06 "alt" = *forward lunging* leap. Different in kind → row_03 = primary jump, row_06-item1 available as forward/approach jump. Not redundant art.
- **crouch/stab (row_03 item3):** short, no trail → **normal** (down/crouch attack).
- **roundhouse (row_04 bottom, 9f):** long for a normal; default = **heavy / launcher normal**, flagged for possible special reclass.
- **knockdown:** row_06 supplies fall→lie AND getup → real knockdown+wakeup art (not a fallback).
- **win-pose:** none exists (Stage 0 item 8). Candidate stand-ins: row_11 sword-ready hold or row_09 re-sheathe. Flag as open art dependency.

## Owner decisions — LOCKED (2026-08-17)
1. **Weapon-state architecture = SINGLE self-contained moveset.** Sword slashes are individual specials that each draw/cut/sheathe; the pistol (row_05) is one ranged special; row_11 draw folds into whichever sword move needs it. NO persistent stance toggle. (Best supported by art — no sword-mode locomotion exists.)
2. **Ultimate = PROMOTE row_09 spin-finish** as a signature ULT — guaranteed scaled payoff, honest reuse **flagged as "no unique ult art"** (Naoya Frame-Trap precedent).
3. **Aerial spin/tumble (row_04 top) = aerial sword special WITH hitbox** (spinning sword attack / air-dash slash).

---

## BUILD COMPLETE (2026-08-17) — all 6 stages

Full 6-stage build shipped. `test:deathstroke` canonical **30/0**; per-stage 25/15/18/10 (Stage 3 = intentional no-op, no command-chain content). Regression clean (boruto/onoki/mayuri/naoya/spiderman all 0-fail). See `BALANCE_AUDIT.md` for the versatility-schema-exception entry. `tools/reslice_deathstroke.py` is the single reslice tool for every `deathstroke_*_uniform.png` sheet.

- **energyType** `adrenaline` · **universe** `dc` · HP 1150 / EN 120 / atk 92 / def 86 / spd 92 · scale 1.3
- **Movement:** idle/walk (distinct)/run/crouch/jump + real knockdown+getup (row_06). Reuses: dash=run, fall=jump, guard=idle.
- **Normals:** light/heavy (row_02) · up-launcher (row_04-bottom roundhouse) · air (row_03 jump-slash) · down_air (reuse air) · crouchLight (row_03 crouch-stab, `_setCrouchVariant`).
- **Specials** (`executeDeathstrokeSpecial`): N Sword Slash (row_07) · F Draw-&-Cut (row_08) · B Gun Shot (row_05 + procedural bullet) · D Running Slash (row_10) · air Aerial Spin (row_04-top).
- **Ultimate** "Killing Stroke" (`executeDeathstrokeUltimate`): promoted row_09 spin-finish, inline freeze-cinematic, 330 raw → 198 EFF sure-hit.
- **Portrait:** the mask icon (row_01). **Win:** repurposed row_11 ready-stance (no bespoke art — flagged). **Open gaps:** no unique ult/win art; no skins/voice yet.
