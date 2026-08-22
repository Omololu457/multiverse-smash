# HANDLER_ASSET_MAP.md — Stage 0 Investigation

**Working title only: "The Handler"** — no real name was given. Confirm before Stage 1
(this gates the roster key / registration). Built from Megumi Fushiguro's former
Ten-Shadows shikigami kit + Mahoraga. This is a NEW standalone character per owner
direction, **not** a restoration of the removed Megumi (Megumi was removed 2026-08-18;
his name survives in-code only as the "Megumi-flag" ×0.60 summon-scaling convention).

Status: **STAGE 0 DONE — every asset below verified first-hand (pixel pass).** No gameplay
code written. STOP per prompt.

---

## Source sheets (3)

| Sheet | Rows | Baked credit | Notes |
|---|---|---|---|
| `mahoraga_*.png` | **6 animation rows + 1 credit strip** | **"ARISRADIKLIF#3447" (Discord) + 呪術廻戦 logo** | see row_07 below |
| `megumi_*` (fushiguro fullview) | base char + technique casts | not yet identified | contains the "by saxcreed" guest |
| `megumi_shibuya_*` (shibuya arc) | 9 clean rows + 2 merged groups | not yet identified | granular shikigami art |

**Attribution TODO:** the Mahoraga sheet artist is confirmed = **ARISRADIKLIF#3447**
(→ SOURCED_ART). The fushiguro & shibuya sheet artists are NOT yet identified from the
baked text (labels were technique names, not signatures) — must be pinned before ship
(credits.test.mjs enforces attribution). The **"by saxcreed"** guest credit must be
preserved *if* that sprite is ever used (default = excluded, so likely moot).

---

## BASE CHARACTER (fushiguro sheet) — all clean, real art, label-band baked top-left

| Asset | File | Content (verified) |
|---|---|---|
| Idle / Stance | `megumi_stance.png` | idle sway animation (two clusters: 4-frame + 6-frame) |
| Walk | `megumi_walk.png` | ~9-frame walk cycle |
| Crouch | `megumi_crouch.png` | 2 frames |
| Jump | `megumi_jump.png` | 2 air frames |
| Hit reaction | `megumi_hit.png` | **REAL** 3-frame recoil → stumble → fall/knockdown |
| Basic combo | `megumi_attack_punches_kicks.png` | punch·punch·elbow → **blade-draw slash** + before/after inset pose pair (right side) |

All carry a white label band top-left (STANCE/WALK/etc.) — same strip-label pattern as
prior reslices; strip on export.

**Gaps (open art dependencies, same as most chars):** no portrait, win, lose, or intro art
anywhere across the 3 sheets.

---

## SHIKIGAMI CAMEO ART (Stage 4)

### Clean granular versions — shibuya arc (PREFERRED)
| Cameo | Files | Content |
|---|---|---|
| Divine Dogs — white | `megumi_shibuya_row_01.png` | growth: small→large sitting white wolf |
| Divine Dogs — black | `row_02` (run, 140px double-row) · `row_03` (pounce/lunge) · `row_04` (claw swipe) | black wolf, fully granular |
| Nue (red bird) | `megumi_shibuya_row_05.png` | summon/growth → flapping flight |
| Banshō (white elephant) | `row_06` (walk/attack) · `row_07` (idle) | "Max Elephant"; `row_06 (1).png` is a **byte-identical duplicate — delete** |

### Fushiguro-sheet cast versions (caster poses + creature, some merged)
| Cameo | File | State |
|---|---|---|
| Divine Dogs (Gyokuken 玉犬) | `megumi_tokusa_no_kage_bojutsu_gyokuken.png` | cast poses + black&white dogs; **also bleeds a "DATTO" label band at bottom** |
| Toad (Gama) | `megumi_tokusa_no_kage_bojutsu_gama.png` | cast poses + small green toad (bottom-right, croppable) — **only source for Toad** |

---

## FLAGGED MERGED GROUPS (Stage 0 item 1) — verified

| File | Contents (verified) | Separability reality |
|---|---|---|
| `megumi_UNSEPARATED_datto_nue.png` | Megumi cast poses + strip of ~6 white **rabbits (Datto)** + one red **bird (Nue)** | rabbits & bird sit in distinct quadrants — **boundary-croppable** |
| `megumi_UNSEPARATED_orochi_bansho_ryokitenkai_yatsuka.png` | cast poses + big white **snake (Orochi)** + white **elephant (Banshō)** + black **ink-pool (Ryōki Tenkai domain floor)** + **"by saxcreed" guest** (labeled "Yatsuka no Tsuka…") bottom-right | creatures croppable; **domain-floor + saxcreed guest region is the genuinely tangled part** |
| `megumi_shibuya_UNSEPARATED_bird_snake.png` | red **Nue flight** poses → white **Orochi** head/coil/open-mouth gallery | bird top, snake mid/bottom — croppable |
| `megumi_shibuya_UNSEPARATED_greencreature_elephant.png` | **unidentified green winged creature** → **Banshō** lie-down→stand transform | creature top, elephant bottom — croppable |

**Correction to the "re-export is a hard blocker" framing:** the shibuya rows already give
CLEAN, granular versions of Divine Dogs, Nue, and Banshō — the fushiguro merged versions
are largely **redundant** for those three. The only cameos that live *solely* in merged/
single files are **Datto (rabbits)**, **Orochi (snake)**, and **Toad (Gama)** — and all
three are boundary-croppable (isolated blobs with whitespace), not truly interleaved.
The genuinely un-croppable region is the **Ryōki Tenkai domain floor + saxcreed guest**.
So a re-export is nice-to-have, not a blanket blocker — see decision C in the report.

---

## MAHORAGA (Ultimate — Stage 5)

| Row | Content (verified) | Role per prompt |
|---|---|---|
| `row_01` | idle + **golden Dharma Wheel icon** + walk + run | Wheel = the "target-lock reticle" (Stage 0 item 4) → **adaptation-tracker UI**. Confirmed, strong fit. |
| `row_02` | stance → **draw curved blade** → advance | entry/arrival (weak opening state) |
| `row_03` | attack combo → **explosion** → knockdown/getup | main attack (on-connect) |
| `row_04` | attack → **black-smoke vanish** | disengage/reposition |
| `row_05` | guard stance → crouch → **circular-slash arc/disc** | "adapted counter" (gated on adaptation) |
| `row_06` | spin poses + **3 crescent motion-trail FX** (grey/light/dark) | trail FX, pairs with row_04 |
| `row_07` | **CREDIT WATERMARK** — "ARISRADIKLIF#3447" + JJK logo | **not animation** → resolves the "6 vs 7 rows" discrepancy |

---

## SELECT ICONS & EXCLUSIONS

- `megumi_shibuya_row_08.png` — **5 black silhouette shikigami icons** (snake / rabbit /
  wolf-dog / dragon / toad). Confirmed = literal cameo-select UI icons (Stage 0 item 3).
- `megumi_shibuya_row_09.png` — **unidentified human fighters** (dark/red-haired pair +
  blonde suited figures, one throwing red projectiles). **Excluded by default** — not this
  character's kit; identity unconfirmed.
- **"by saxcreed" guest** (in the orochi/bansho merged file) — **excluded by default**;
  preserve credit only if ever used.

---

## DECISIONS (owner, 2026-08-18)
- **A. Name — LOCKED: keep working title "The Handler"**, roster key `handler`. Renameable
  before ship.
- **B. Ryōki Tenkai (Domain Expansion) — LOCKED: build as a SECOND signature special**
  (alongside the shikigami kit). NOT the Ultimate slot (that is Mahoraga). Uses the
  domain-floor art → requires the tangled domain region separated (see C).
- **C. Merged groups — LOCKED: crops now, re-export only the domain region.** Proceed with
  clean shibuya rows + boundary-crop Datto/Orochi/Toad from their files. Request a real
  re-export ONLY for the domain-floor + saxcreed region (needed for B). Unblocks Stage 4.
- **D. Adaptation-ladder numbers** — deferred to playtesting (Stage 5/6 balance).

## OPEN / DEFERRED
- Real name (working title accepted for now).
- Re-export of the **domain-floor + saxcreed guest** region only (blocks Domain special B).
- Identify the fushiguro & shibuya sheet artists for credits.js (Mahoraga = ARISRADIKLIF#3447 done).
- Adaptation-ladder tuning (playtesting).
