# SUKUNA (Bitsverse644 "Dark Souls" rip) — STAGE 0 ASSET MAP

**Character:** Ryomen Sukuna / Yuji-vessel body (Jujutsu Kaisen). Pink spiked hair, black-and-red high-collar uniform, red shoes. Original sprites by **Cinontk**; sheet compiled/watermarked by **@BITSVerse644** ("Custom Sheet by Bitsverse"). Attribution MUST be preserved for any external-facing use.

> SEPARATE BUILD. A different, complete Sukuna already exists in this project from other sheets. This audit covers ONLY the 10 `sukuna_row_*.png` strips in repo root. Ignore the existing character.

> **CRITICAL:** the file-index numbering does NOT match the pre-existing text audit's "ROW" labels. Everything below is mapped by VISUAL CONTENT. See the correction table at the end.

---

## Per-strip breakdown

All strips are 1945px wide, RGBA, fully transparent background (clean alpha slicing). Gameplay cell height ≈ **46–66px**; gameplay cell width ≈ **33–58px**. Everything much larger than that is reference/cutscene art.

### `sukuna_row_01.png` — 1945×66 — **INTRO (walk-in)** — REAL gameplay art
Label baked in: **"Intro:"**
- x5–442: ~13 frames, cell ≈33×66. Character walks in from left facing screen, then a short settle. Frames progress: side-facing stride → turns to face camera → standing settle.
- x527–550: 1 extra hunched/crouched pose (a battle-ready settle beat, gap-separated).
- **NOTE:** The pre-existing audit called this a "5-frame close-up mouth strip." That is WRONG — this strip is the intro walk-in. (The mouth close-up lives in the Domain cutscene, see row_05/06.)

### `sukuna_row_02.png` — 1945×1301 — **PRIMARY MOVEMENT + STATE SHEET** (+1 huge render) — REAL gameplay art + 1 reference
Multi-row sheet with baked-in text labels. Left region (x 0–~1060) = gameplay; far right (x1066–1693) = oversized render.
Internal rows (by y-band, all cell ≈46–62px tall):
- **Intro tail** (top-left, 3 frames): hunched frames continuing the row_01 intro.
- **(unlabeled menacing/taunt band, ~7 frames):** arms-raised / clawing / menacing power poses — reads as a taunt or intro-flourish.
- **"Stand:"** — 3 idle frames.
- **"Walk:"** — ~7 walk-cycle frames.
- **"Dash:"** — 2 frames (motion-blur streak).
- **"Jump:"** — ~7 frames (rise/apex/fall).
- **"Guard:"** — guard/block frames (small count).
- **"Hit:"** — 3 hurt-reaction frames.
- **"Down:"** — 3 knockdown/getup frames (fall → lie → rise).
- **"Ultimate Action:"** — 5 frames, standing power-up/charge stance.
- **ATTACK STRINGS** (mid/lower bands): punches & kicks with **red slash crescents** (Dismantle/Cleave melee), uppercut/knee frames, run cycle, and a **ranged energy-beam projectile** sequence (charge → cupped hands → fire pale-white beam → recovery → a detached small round energy orb "in flight"). See "Projectiles" note below.
- **Victory/afterimage** streak silhouettes appear at the far-right of a lower band (2 dark motion-blur ghosts — FX-only).
- **RIGHT: static reference render** x1066–1693, **627×1250px**, arms-raised full-body Sukuna. REFERENCE-ONLY (portrait-quality), NOT animation. Too large for gameplay.

### `sukuna_row_03.png` — 1945×766 — **SECONDARY GAMEPLAY SHEET** (grab / dodge / run / kicks / victory-ghost) (+1 render) — REAL gameplay art + 1 reference
Internal rows (cell ≈46–58px tall):
- **Top-left clusters:** grab/hold poses (holding opponent), crouch/dodge (2f), hit-reaction + knockdown-tumble.
- **Top-right:** knockdown/faceplant frames (2f).
- **Long horizontal band (~20 frames), x0–~830, y≈256–314:** first ~5 hunched, then ~15 upright standing/gesturing frames. **SAME cell size as idle** → REAL gameplay-res, NOT an oversized turnaround. Reads as a long taunt / extended idle / victory-pose sequence.
- **Attack strings (mid band):** dodge-roll, run cycle, **jump-kick / aerial flying-kick with motion trail**, a **spinning/roundhouse kick with a pale-tan crescent-arc FX**, plus knockdown/getup frames.
- **Bottom band (x0–~700, y≈696–746): VICTORY / AFTERIMAGE GHOST technique** — 2 colored frames → progressively **white outline-only silhouette frames** (shrinking) → final white motion-streak/dash blur. FX-heavy afterimage-dash-away effect.
- **RIGHT: static reference render** x1336–1565, **229×735px**, clean standing full-body Sukuna. REFERENCE-ONLY. This is the cleaner render → **best PORTRAIT source** (crop the head/bust).

### `sukuna_row_04.png` — 1945×195 — **DOMAIN EXPANSION cutscene panels** — CUTSCENE art (not gameplay)
- Small character frames top-left (~3, ≈60px) = character standing before the domain (part of the cutscene composition, not hitboxed frames).
- Large pink-flesh + white-bone panels (~272px+ wide each) = Malevolent Shrine skull/mouth construct pieces. Oversized, cutscene-only.

### `sukuna_row_05.png` — 1945×200 — **DOMAIN EXPANSION cutscene panels (mouth/teeth)** — CUTSCENE art
- The giant open **MOUTH / JAW with teeth** (the Malevolent Shrine's mouth) + bone construct with aura. Oversized panels (272–467px). **This is where the "mouth close-up" content actually lives** (the pre-existing audit mis-attributed it to "row_01").

### `sukuna_row_06.png` — 1945×270 — **DOMAIN EXPANSION cutscene** — CUTSCENE art
- 3 wide panels (~415–428px). Torii-gate frame + giant open mouth + teeth. Malevolent Shrine composition.

### `sukuna_row_07.png` — 1945×612 — **DOMAIN EXPANSION cutscene (full shrine)** — CUTSCENE art
- 3 tall panels (~590–687px wide, up to ~610px tall). The complete **Malevolent Shrine temple** (red torii pavilion, dark-green blade-fronds, skull, multiple mouths, bone-piled base). Multi-panel domain establishing shot. Definitely oversized cutscene, no hitboxes.

### `sukuna_row_08.png` — 1945×34 — **WATERMARK TEXT** — NOT ART
- "If this sheet isn't at @BITSVerse644 & is reposted on another account, yo mom a hoe!"

### `sukuna_row_09.png` — 1945×31 — **WATERMARK TEXT** — NOT ART
- "Original Sprites by Cinontk" (attribution, right-aligned).

### `sukuna_row_10.png` — 1945×32 — **WATERMARK TEXT** — NOT ART
- "Custom Sheet by Bitsverse[644]" (attribution, right-aligned).

---

## Projectiles / slash FX inventory (distinct assets)
1. **Pale-white energy BEAM projectile** (row_02) — charge → fire → detached round orb in flight. The ranged move (== "Open/Fūga Fire Arrow" candidate). Has real charge+fire+in-flight frames.
2. **Red melee slash crescents** (row_02/03) — attached to punch/cleave normals (Dismantle/Cleave melee). FX baked onto strike frames.
3. **Pale-tan crescent kick-arc** (row_03) — on the spinning/roundhouse kick. FX baked onto the kick frame.
4. **White outline-only afterimage silhouettes + motion streak** (row_03 bottom, row_02) — victory/KO dash-away FX. Rendering-heavy (outline-only ghosts).

Only **ONE** true detachable/ranged projectile asset exists (#1). The rest are melee-attached FX.

---

## GAPS / MISSING (what a full fighter needs that is ABSENT here)
- **No dedicated PORTRAIT/UI icon art** — must crop bust from the row_03 static render (229×735, cleanest) or row_02 render.
- **No WIN/VICTORY pose that's clearly bespoke** — the "victory-ghost" and long taunt band exist, but no simple standing win pose is explicitly labeled (the long row_03 band can serve as taunt/win).
- **No LOSE/defeat pose** distinct from the "Down" knockdown.
- **No CROUCH-IDLE explicitly labeled** — crouch/dodge frames exist (row_03) but no clean sustained crouch idle.
- **No dedicated ULTIMATE payoff art** beyond the "Ultimate Action:" charge stance (5f) + the Domain cutscene panels (rows 04–07). The ult must be assembled: charge stance → inline Domain cutscene (rows 06/07 as backdrop).
- **No unique light/heavy air-attack variety** beyond the jump-kick — normals pool is modest.
- **No skin/color variants**, **no voice clips** (none in these strips).
- **Command-throw follow-through art is thin** — grab holds exist (row_03) but the "thrown object" frame the old audit mentioned is not clearly present as a separate throwable.

---

## PROPOSED KIT (sized to the art that ACTUALLY exists)

**Movement/State (all REAL, row_01+row_02+row_03):**
- Intro (row_01 walk-in), Idle/"Stand", Walk, Dash (blur), Jump (rise/apex/fall), Guard, Hurt/"Hit", Knockdown+Getup/"Down", Crouch/Dodge (row_03).

**Normals (row_02/03 attack strings):**
- Light punch, Heavy punch (with red slash crescent), Uppercut/knee launcher, Air-attack = jump-kick (row_03), Down/spin kick (pale-tan arc, row_03).
- Enough distinct strike art for ~5 normals.

**Command chain (1):**
- A Cleave/Dismantle melee string using the red-crescent punch frames (2–3 stage rekka feasible from the punch/uppercut cluster).

**Specials (dir-based, from real art):**
- **Fire Arrow / Dismantle-Ranged** = the pale-white energy beam projectile (row_02 charge→fire→orb). The ONE real projectile.
- **Spinning/roundhouse kick** (tan-arc, row_03) = a lunging kick special.
- **Grab/Throw** = from row_03 grab-hold frames (short-range command grab).
- **Dodge/afterimage** = evasive using dodge frames + white-ghost FX (optional).
- Realistically ~2–4 solid specials; do NOT over-promise a huge special roster.

**Ultimate:**
- **"Domain Expansion: Malevolent Shrine"** = "Ultimate Action:" charge stance (row_02, 5f, live fighter) → INLINE freeze-cinematic using rows 06/07 shrine panels as fullscreen backdrop (do NOT sprite-slice into small cells — composite as an overlay, Saitama Death-Punch / Mayuri-Bankai pattern). Guaranteed payoff. The mouth/teeth panels (rows 04/05) are alternate/detail frames for the cinematic.

**Portrait/UI:** crop bust from row_03's 229×735 render.

**Win/Taunt:** use the long row_03 upright band (~15f) as a taunt/victory sequence; victory-ghost (row_03 bottom) as an optional KO flourish.

---

## FILE → CONTENT CORRECTION TABLE (old audit "ROW" label → actual file)

| Old audit label | Actual file | Actual content |
|---|---|---|
| "row_01" = mouth close-up (5f) | WRONG. `row_01` = **Intro walk-in**. Mouth close-up = **`row_05`/`row_06`** (Domain). |
| "ROW 02" = walk-in intro | = **`row_01`** (Intro), plus intro tail in `row_02`. |
| "ROW 03" = idle/dash/jump/guard/hit/down/ult/attack-strings/run/grab | = **`row_02`** (movement+state+attacks) AND **`row_03`** (grab/dodge/run/kicks/victory-ghost). Split across two files. |
| "ROW 04" = crouch/walk/projectile/jumpkick/victory-ghost | Content is in **`row_02`+`row_03`**. File `row_04` is actually **Domain cutscene panels**. |
| "ROW 05" = static reference render | WRONG. Renders live in **`row_02` (627×1250)** and **`row_03` (229×735)**. File `row_05` = **Domain mouth panels**. |
| "ROW 06–07" = Domain cutscene | CORRECT → **`row_06`+`row_07`** (and `row_04`,`row_05` are ALSO Domain panels). |
| "Fire Arrow" projectile | = the pale-white beam sequence inside **`row_02`**. |

**Reference-only / cutscene / non-gameplay (exclude from hitboxed animation):**
- Renders: row_02 (627×1250), row_03 (229×735) → portrait/reference ONLY.
- Domain cutscene: row_04, row_05, row_06, row_07 → ult cinematic overlay ONLY.
- Watermark text: row_08, row_09, row_10 → NOT art (preserve attribution externally).
