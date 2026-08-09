# Zaraki Kenpachi — Asset Map & Stage-6 Kit Audit

Bleach universe, 2nd Bleach sprite character (after Ichigo). Built stage-by-stage against
`ZARAKI_FULL_BUILD_SPEC`. This file is the Stage-6 cross-check: **every sprite in the spec →
the exact role it was wired to**, plus the explicit asset-gap list.

- Test: `npm run test:zaraki` → **82 / 0** (consolidated Stages 1–5, stable across repeated runs).
- Registration (5-file gate): `characters.js` (entry + export), `spritesheets.js` (SPRITE_MANIFEST idle-decode
  gate), `sprite.js` (MOVE_TO_ACTION), `abilities.js` (command/special/ultimate/assist logic), `game.js`
  (command dispatch, charge-release, ult dispatch, misc-timer ticks, round-reset reverts).
- Slicing: every gameplay sheet is a `*_uniform.png` produced by `tools/reslice_strip.mjs` (feet-aligned,
  `anchorY:0`). Filename oddities in the spec are preserved verbatim in the art (`tuant_2`, `shinkai`/`shikai`,
  `specail`, `atttack`); three disk names carrying spaces / a double-dot were normalised to the spec's
  underscore names (`low_health_idle_`, `transparent_copy`, `shinkai_down_air_attack_png`).

Status legend: ✅ wired · 📄 reference-only (verification, not gameplay — by spec design).

---

## MASTER REFERENCE (verification only, not moves)

| Spec file (on disk) | Role | Status |
|---|---|---|
| `zaraki_kenpachi__tybw____transform__by_prodijiu_ddywxzg.png` | concept/QA reference art | 📄 not wired (by spec) |
| `zaraki_transparent.png` | transparent-bg duplicate, cutting/verification source | 📄 not wired (by spec) |
| `zaraki_transparent_copy.png` | character-select thumbnail | ✅ `characters.js` → `portrait` |

## STAGE 1 — Base movement / states

| Spec file | Role (action) | Status |
|---|---|---|
| `zaraki_idle.png` | `idle` | ✅ |
| `zaraki_low_health_idle_.png` | `idleLow` — cosmetic low-HP idle swap (≤30% HP, no stat change) | ✅ |
| `zaraki_move.png` | `walk` + `run` (one strip, walk slower) | ✅ |
| `zaraki_dash.png` | `dash` (1-frame lunge) | ✅ |
| `zaraki_jump.png` | `jump` + `fall` (descent cell via sourceX) | ✅ |
| `zaraki_block.png` | `guard` | ✅ |
| `zaraki_hit.png` | `hurt_air` (airborne hit reaction) | ✅ |
| `zaraki_hit_1.png` | `hurt` (flinch) + `knockdown` | ✅ |
| `zaraki_hit_2.png` | `knockdownHeavy` (heavy/launcher sprawl) | ✅ |
| `zaraki_taunt.png` | `taunt` (primary; universal taunt-heal) | ✅ |
| `zaraki_tuant_2.png` | `tauntAlt` (random-picked alt taunt at commit) | ✅ |

## STAGE 2 — Base normals + specials

| Spec file | Role | Input | Status |
|---|---|---|---|
| `zaraki_combo_1.png` | `light` | B (J) | ✅ |
| `zaraki_combo_2.png` | `heavy` | Y (K) | ✅ |
| `zaraki_up_attack.png` | `up` launcher | Up+B (I) | ✅ |
| `zaraki_foward_slash_1.png` | `zarakiFwdSlash1` command normal | Fwd+Light | ✅ |
| `zaraki_foward_slash_2.png` | `zarakiFwdSlash2` command normal | Fwd+Heavy | ✅ |
| `zaraki_up_attack_to_down_air_combo.png` | `zarakiAirUp` (up-swing) + `zarakiAirDown` (repeat → slam), one sheet split by sourceX | Up+B airborne; repeat | ✅ |
| `zaraki_super_foward_attack.png` | `charge` windup (frames 0-2) + `zarakiChargedDash` strike (3-6) | CHARGE (P) hold→release | ✅ |
| `zaraki_special_effect.png` | Charged Dash impact dust (visualOnly FX) | — | ✅ |
| `zaraki_hollow_down_attack_assist.png` | `zarakiHollowStrike` (Zaraki's own overhead spike, not the assist) | neutral SPECIAL (L) | ✅ |

## STAGE 3 — Shikai (timed power-up mode; enter via Up+Special, 13s, ×1.2 dmg, `_skinAnim` swap)

| Spec file | Role | Status |
|---|---|---|
| `zaraki_shikai_release.png` | `shikaiRelease` transform-in + Shikai `charge` windup pose | ✅ |
| `zaraki_shikai_idle.png` | Shikai `idle` | ✅ |
| `zaraki_shikai_run.png` | Shikai `walk` + `run` | ✅ |
| `zaraki_shikai_dash.png` | Shikai `dash` | ✅ |
| `zaraki_shinkai_jump.png` | Shikai `jump` + `fall` | ✅ |
| `zaraki_shinkai_block.png` | Shikai `guard` | ✅ |
| `zaraki_shinkai_hit_2.png` | Shikai `hurt` / `hurt_air` / `knockdown` / `knockdownHeavy` (single reaction covers all) | ✅ |
| `zaraki_shinkai_combo_1.png` | `zarakiShikaiC1` (combo rekka stage 1 / standalone poke) | ✅ |
| `zaraki_shinkai_combo_2.png` | `zarakiShikaiC2` | ✅ |
| `zaraki_shinkai_combo_3.png` | `zarakiShikaiC3` | ✅ |
| `zaraki_shikai_combo_4.png` | `zarakiShikaiC4` (finisher/launcher) | ✅ |
| `zaraki_shinkai_up_atttack.png` | `zarakiShikaiUp` (Up+B rising slash) | ✅ |
| `zaraki_shinkai_down_air_attack_png.png` | `zarakiShikaiDownAir` (Jump+B aerial slam) | ✅ |
| `zaraki_shikai_specail_attack.png` | `zarakiShikaiSpecial` (SPECIAL in Shikai) | ✅ |

Combo chain = Light **or** Heavy → C1→C2→C3→C4 (cancel-on-hit rekka). Auto-reverts to Base on timer
expiry, KO, or round reset.

## STAGE 4 — Bankai ultimate

| Spec file | Role | Status |
|---|---|---|
| `zaraki_bankai_ultimate.png` | `zarakiBankai` — single-use burst attack (U, 100 reiatsu). Callable from Base OR Shikai; returns to whichever form was active. NOT a mode change (the red-demon transform is baked into the frames only). | ✅ |

## STAGE 5 — Yachiru Kusajishi assist (Down+Special, meter + cooldown gated, both forms)

| Spec file | Role | Status |
|---|---|---|
| `zaraki_Yachiru_Kusajishi_dash_assist.png` | Yachiru dash-in (visualOnly telegraph) | ✅ |
| `zaraki_Yachiru_Kusajishi_throw.png` | `zarakiYachiruThrow` — Zaraki's throw pose | ✅ |
| `zaraki_Yachiru_Kusajishi_throw_projectile.png` | thrown projectile (damaging) | ✅ |
| `zaraki_specail_effect_assist.png` | impact VFX on connect (projectile `impact` field) | ✅ |

Sequence: dash-in → throw pose → projectile travels → VFX on connect. Fire-and-forget — never touches the
Shikai timer or Bankai (verified from Shikai form).

---

## File accounting

- **40 sprites wired** to real gameplay roles (39 `*_uniform.png` gameplay sheets + `transparent_copy` portrait).
- **2 reference-only** (unwired by spec): the concept art (`…prodijiu_ddywxzg.png`) and `zaraki_transparent.png`.
- **0 gameplay sprites left unused.**

## ASSET GAPS (explicit — not silently worked around)

1. **Shikai → Base revert animation: MISSING.** No return sheet exists on disk, so revert cuts straight to
   Base idle (spec-acknowledged). If a return sheet is added later it drops into `revertZarakiShikai`.
2. **No pre-match intro art.** Zaraki ships no intro sheet → uses the shared/idle intro (no `introPool`).
   (Common to several roster chars; not a spec sprite.)
3. **No win / lose pose art.** No dedicated victory/defeat sheets exist → default end-of-round behavior.
   (Common to several roster chars; not a spec sprite.)
4. **Cosmetic base-art bleed during Shikai (minor):** the Bankai burst and the Yachiru throw pose render
   their base-form art even while in Shikai (both intentionally live in base `animationData` so they resolve
   from either form with identical art). Brief and by-design; flagged for transparency.
5. **Shikai has no dedicated taunt/charge art:** taunt borrows the base taunt; the Shikai charge-hold pose is
   repointed to the release gather (no base-form bleed). Not a spec sprite.

## Balance note (numbers are PROPOSED per spec — no final lock)

Profile: durability/power brute — HP 1240 (top tier), Atk 98, Def 88, Speed 88 (below average), Reiatsu 120,
no 8-way dash. Mobility is the deliberate tradeoff for the high HP + big-damage kit. Spot checks vs roster
conventions: Bankai 300 (Ichigo ult ~330 → in-band); Shikai ×1.2 for 13s at 60 reiatsu (gated, one instance);
Yachiru assist 70 dmg at 25 reiatsu + ~3s cooldown (in the projectile-special band). **Watch items** for a
dedicated balance pass: (a) Shikai buff uptime/frequency, (b) HP 1240 sitting at the top of the tier, (c) the
Charged Dash firing on every CHARGE-release means Zaraki cannot quietly build meter — a self-limiting downside,
intended. Verdict: **fair, versatility-and-durability rather than raw-power outlier** — pending the roster-wide pass.
