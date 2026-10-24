# BEN 10 — PRIME VARIANT: PENDING ART

"Prime Ben" (black shirt, green stripe, brown pants; energy auras / dashes /
shockwaves) is registered as a **selectable variant** but has **no source sheet in the
repo**. Until `assets/sprites/ben10/ben_prime.png` is added, Prime renders the **Alien
Force** human frames with a **render-only green Omnitrix aura overlay** (no gameplay
difference from Alien Force except its Phase-2 stat block and the Phase-4 Prime special
set, which are gated on `benVariant === "prime"`).

Registration: `skins.js` → `SKINS.ben10` → `{ id: "ben10Prime", name: "Prime",
benVariant: "prime", primePending: true, auraOverlay: "#39ff14", animationData: null }`.
`animationData: null` makes it inherit the Alien Force base frames.

## Moves waiting on Prime art (per the build brief)

Prime's kit is energy/aura-themed. The engine wires all of these generically; the ONLY
thing missing is dedicated Prime frames. Each entry below notes the intended Prime art
and the current fallback (Alien Force frame + render-only green FX).

| Prime move | Input | Intended Prime art | Current fallback |
|---|---|---|---|
| **Energy Shot** (projectile) | ↓↘→ + Special (cost 12) | green energy-blast fire rows (2 cast + 3 projectile frames) | AF heavy/punch frame + render-only green projectile |
| **Green Dash** (Dash Strike) | →→ + Special (cost 10) | crouch-up dash arcs (green streak trails, 6 diminishing) | AF run/lunge frame + render-only green streak |
| **Shockwave** | ←↙↓ + Special (cost 18) | shockwave rings (5 growing rings) + strike strip | AF heavy frame + render-only expanding rings |
| **Energy Guard** (defense) | Block + Heavy (cost 10) | energy sphere/barrier (3 big green spheres + 1 dissolving) | AF guard frame + render-only green bubble |
| **Overcharge** (aura buff) | — | aura power-up (4 big auras, 1 huge, 1 burst) | render-only green aura overlay (always on for Prime) |
| **Omnitrix Overload** (ultimate) | Full Power (100) | aura + sphere frames | AF transform-flash frames + render-only green radial FX |

## "Add the Prime sheet" procedure (no engine edits)

1. Drop `assets/sprites/ben10/ben_prime.png` into the repo.
2. Slice human-Ben + Prime energy-FX frames with `ben10_work/extract.py` +
   `pack.py` (suffix `__prime`), mirroring the Classic flow. Export the per-action
   uniform strips `ben10_<action>_uniform__prime.png`.
3. Add a `BEN10_PRIME_ANIM` map in `skins.js` (copy `BEN10_CLASSIC_ANIM`, repoint sheets
   + dims) and set the Prime variant's `animationData: BEN10_PRIME_ANIM`,
   `primePending: false`.
4. Point the Prime specials' cast poses at the new Prime FX frames in the alien/variant
   move table (data only).
5. Update `docs/ben10/SPRITE_LEDGER.md` with the Prime frame→move rows.

The aura overlay, stats, and specials already exist — only the art and the two data
lines above change.
