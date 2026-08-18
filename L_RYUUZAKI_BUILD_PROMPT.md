# BUILD PROMPT — L "Ryuuzaki" (Death Note)

Staged build plan. **Approved sign-offs (locked):**
- `energyType: "deduction"` + stats `HP1040 / EN200 / atk84 / def80 / spd90` — confirmed as-is.
- **NO Ultimate** — `row_19` ships as a special, NOT promoted to a cinematic ult. Genuine content
  ceiling (honest "real gap, not invented" — Jason precedent). Do not fabricate art or force a cinematic.

> **Reference docs (read first):** `L_RYUUZAKI_ASSET_MAP.md` (complete content audit + confirmed
> schema-exception design) and the **Light Yagami** implementation — same `deathnote` universe,
> reuses Light's idioms:
> - `characters.js` `const light` (~L5650): def shape, schema-exception special-heavy profile.
> - `abilities.js` `executeLightSpecial` / `LIGHT_SUMMONS` (L4346–4393): phantom-hitbox specials +
>   the **`ryuk` config borrowed at Stage 5**.
> - `tools/reslice_light.py`: reslice-to-uniform template.
>
> Follow the project's **staged build + stop-and-screenshot** discipline: each stage ships its own
> `test:l_ryuuzaki-stageN` harness, screenshot to verify REAL rendering (not procedural boxes), and
> STOP for review before the next stage.

## Identity (locked)
- `rosterKey: "l_ryuuzaki"`, `name: "L"`, `universe: "deathnote"`, `color: "#3a3a44"`.
- Frail special-heavy zoner/technician (capoeira kicker + call-ins).
- Stats: `maxHealth 1040 / maxEnergy 200 / attack 84 / defense 80 / speed 90 / maxJumps 2 /
  jumpPower 32 / dashSpeed 19` (+ `dashDuration`/`dashCooldownMax` per Light).
- **NEW** `energyType "deduction"` → add `deduction: "Deduction"` to `ui.js ENERGY_TYPE_LABELS`.
- `spriteScale: 2.0`, `anchorY: 0` everywhere (idle ≈50px → ~100px on-screen).
- **NO ultimate** (art gap). `ultimate` HUD field omitted or placeholder — do not invent.
- Follow-ups deferred (not in this build): skins, voice.

## STAGE 1 — registration + movement/state → `test:l_ryuuzaki-stage1`
**5-file gate:** (1) NEW `tools/reslice_l_ryuuzaki.py` — reslice keyed strips in
`l_ryuuzaki_sprite_rows_sliced/` into uniform, feet-aligned `l_ryuuzaki_*_uniform.png` per action
(raw strips untouched); (2) `spritesheets.js` SPRITE_MANIFEST idle gate; (3) `characters.js` def;
(4) `skins.js` `l_ryuuzaki` default (else `applySkin` → scale-1 shrink); (5) `credits.js`
PROJECT_ART_KEYS. Also: add the `ui.js` energy label.

`animationData`:
| action | source | note |
|---|---|---|
| idle (standing) | `row_20` | ping-pong loop; **drop f14–15 debris islands** |
| idle_seated | `row_22` | contextual + win-pose; optional trigger: after N frames no-input |
| walk | `walk` | (f2=f4 dup ok) |
| run | `row_05` | run cycle |
| dash | `row_05`/`row_07` | cleanest cells |
| jump / fall | `row_07` capoeira acro | double-duty air-state where plausible, else procedural fallback (confirm case-by-case once assembled) |
| guard | **procedural fallback** | no dedicated art (confirmed gap) |
| hurt / knockdown / getup | `knockdown` | drop trailing 3px debris sliver; **getup = `knockdown` f10** |
| taunt | `point` | accusing-point gesture |
| portrait | **split `idle_face`** | frame 1 (L face-bust) → `l_ryuuzaki_portrait.png`; **4 Ryuk frames → reserve for Stage 5** |

`__harness.l_ryuuzakiStage1` hook. Screenshot idle (standing + seated), walk, run, jump,
hurt/knockdown. STOP.

## STAGE 2 — 5 normals → `test:l_ryuuzaki-stage2`
| slot | source | content |
|---|---|---|
| light | `row_09` | jab/straight punch |
| heavy | `row_10` | heavy punch/palm + golden swipe FX |
| up (launcher) | `row_11` | rising uppercut + upward golden arc; set `launchVy` |
| air | `row_12` | air spin kick + golden crescent |
| down_air | `row_13` | **shared dive pose** (double-serves with the command chain — approved shared-art, knockdown-getup precedent) |

Golden-arc FX = reusable frameIndex-synced overlay (`drawLRyuuzakiNormalFx`, Light
`drawLightNormalFx` precedent) — don't bake per-sheet. Screenshot 5 normals connecting. STOP.

## STAGE 3 — command-normal capoeira chain → `test:l_ryuuzaki-stage3`
Assemble ONE continuous cancelable string from `row_07 + row_13 + row_16 + row_17`, de-duplicated
on confirmed identical frames (`row_07 f2==row_16 f1`; `row_07 f3/f7==row_17 f4`;
`row_07 f4/f8==row_17 f5`; `row_07 f6==row_13 f3`) — union unique frames, order by motion;
**`row_07` is the spine**. Build cancelable (`updateLRyuuzakiCommandCombat`, Obito/Onoki-command
precedent — reactive to input edges, not blind spam). Reuse `knockdown` f10 for getup. Screenshot
mid-string + cancel. STOP.

## STAGE 4 — 4 specials + kick_trail EX → `test:l_ryuuzaki-stage4`
`executeLRyuuzakiSpecial` (dir-branched via `_specialHeldDir`, Light pattern; phantom-hitbox
`spawnProjectile`, `applyScaledDamage` ×0.60):
1. **Bazooka** (`gun_rocket`, confirmed ONE move) — long-range projectile; ref Light `gunman`
   (dmg~52, speed~14, life~40).
2. **Investigation/Analysis** (`row_21` reframed) — **non-lethal** setup/analysis special (red
   notebook-manifest art repurposed; NOT a lethal Death Note attack).
3. **Golden rising burst** (`row_14`) — launcher/flurry, golden-arc FX family.
4. **Golden nova** (`row_19`) — marquee golden energy burst (biggest FX; super-tier feel, still a special).

**EX:** `kick_trail` multi-hit flurry = **cancel-only extension** off the command chain or a normal
(Vegeta EX Ki Punch precedent), NOT from-neutral. Screenshot each. STOP.

## STAGE 5 — Ryuk cameo-attack → `test:l_ryuuzaki-stage5`
Reuse Light's **`LIGHT_SUMMONS.ryuk`** mechanics verbatim in shape (`abilities.js:4351`: cost 30,
dmg 66, w62×h92, speed 3, ky -7, life 28, delay 10, `launcher:true`, phantom-hitbox / non-persistent)
— but point the sheet at **L's own Ryuk art** (`ryuk_monster_row1` idle + `row2` laugh + the 4
`idle_face` frames reassigned here). **Ryuk's ONLY offensive move**; his idle/laugh art elsewhere
stays pure cameo/flavor (audit constraint: no Ryuk attack frames exist). Screenshot swoop-in
connecting. STOP.

## STAGE 6 — portrait + canonical harness + balance → `test:l_ryuuzaki`
Finalize `l_ryuuzaki_portrait.png` (L face-bust). Canonical suite (static + box-sweep over all
normals/command/specials/EX + Ryuk). `BALANCE_AUDIT.md` entry: schema-exception versatility
(Light/Madara/Isshiki/Saitama class), honest ×0.60, FRAIL frame (no roster stat record), watch-items
= special-heavy breadth + non-persistent Ryuk. Regression: Light (shared `deathnote` infra) +
neighbors stay 0-fail. STOP → report.

## GOTCHAS
- Split `idle_face` BEFORE Stage 5 needs the 4 Ryuk frames.
- Golden-arc FX = frameIndex-synced overlay; preload/decode sheets at boot (Mayuri precedent).
- Command-chain harness must be phase-reactive (poll recovery, one clean input edge — blind
  Heavy-spam latches `_cmdPrev`).
- `spawnProjectile` drops `superArmor`/`launchVy` set on the move — set them on the attack directly
  (Jason precedent).
