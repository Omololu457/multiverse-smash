# Adding an Omnitrix alien

Readiness, mechanics and art are separate concerns. A registry label alone does
not make a form playable or finished. Do not add a new roster character for an alien.

## Extension points

- Add declarative identity, modifiers, moves, readiness, sheet and ledger metadata
  in `aliens.js` (Swampfire's definition lives in the leaf `swampfire.js`).
- Add or reuse a mechanical pool entry in `fighters.js` and route its actual
  special/ultimate functions in `abilities.js`. Do not pre-scale raw move damage
  and then also apply the same form modifier in the damage pipeline.
- Add real animation definitions and verified sprite files. `benAlienHasArt` is
  actual runtime art availability, not the old misleading whitelist name.
- Supply a labeled contact sheet, geometry and source-frame ledger with every
  frame used, reused, or excluded for a stated reason.
- Extend generic optional hooks only when needed. Swampfire's exact-frame profile,
  explicit rectangle/radial projectile colliders and bounded connecting hold are
  opt-in; they do not retime unrelated authored moves.

## Exposure contract

`isAlienAvailable(key, experimental)` is the common capability rule. Normal play
requires status ready plus actual sheet/ledger references. Experimental access is
explicit, separate from roster developer unlocks, and labels placeholder forms.
Currently only Swampfire is approved; 13 former picker forms remain experimental.
The other mechanical pool records remain retained and unexposed.

`createOmnitrixState` prunes invalid or disallowed old selections and falls back to
an approved form. `applyAlien` and framework transform/swap entry points validate
availability again. Never offer a slot merely because a pool key exists. The
legacy BEN10_ART_ALIENS export is a compatibility catalog, not proof of real art.
`buildLoadout` / `getAlienBySlot` default to approved definitions, with explicit
experimental options; empty metadata slots are not selectable production forms.

Normal default loadout is Swampfire. Ben-only development mode can be opened with
`?benExperimental=1`; harness matches have an explicit experimental override and
retain the legacy five-form development default. A match carries its policy and
loadouts in replay/host setup, so local preferences cannot change peer eligibility.
Prime is a pending-art experiment and is filtered from normal skin selection.

## Required lifecycle contract

- Store authoritative gameplay state as ordinary serializable fighter/device data.
- Use simulation frames and the established match-seed/frame/player hash for RNG.
- Keep frame ledgers, sprite drawing, sounds and particles outside collision state.
- Preserve the selected human's HP pool and complete stat/art snapshot on reversion.
- Clear form-local state on switching/reversion and all device transients on round,
  rematch or general training reset. Identity replacement clears old Ben-owned state.
- Tag delayed Ben actions with an owner/form/action generation. Invalidated work
  cannot execute; already emitted detached projectiles keep their authored lifetime.
- KO clears executable transient state and recovery, retaining art only for the
  defeat pose until a full human/device reset. Never regenerate at zero HP.
- Distinguish once-per-round passives from once-per-match rules. Full healing does
  not counterfeit a new round for Last Resort.

## Verification before approval

Test actual move dispatch, Power spending, spawn-to-hit collision, effective damage,
block/interrupt/launch behavior, human restore, resets, art in both directions and
supported replay/network modes. Test stale saved loadouts and direct entry points.
Do not replace failed assertions with broad tolerances or mark placeholders ready.
Review Swampfire's README and ledger as an implemented example.
