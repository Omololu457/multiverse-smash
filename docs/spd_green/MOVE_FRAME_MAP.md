# S.P.D. Green — Move → Frame Map

Values are startup / active / recovery in sim frames at 60 Hz, followed by raw damage (from `spdGreenData.js`).
All moves use the `frameExact` path. Applied damage in the Green mirror is about 0.588 × raw.

| Move | Input | St/Ac/Rec | Raw | Cells |
|---|---|---|---|---|
| J1 | Light | 5/2/10 | 17 | strike0-1 |
| J2 | Light (chain) | 6/2/12 | 20 | kick0-1 |
| J3 | Light (chain) | 9/3/18 | 28 | kick1-2 |
| Heavy | Heavy | 13/3/25 | 52 | arc4-5 |
| Low | Down+Light | 8/2/16 | 25 (low) | ground1 |
| Launcher | Up+Light / Up attack | 12/3/22 | 42 | acro0-1 |
| Air | Light/Heavy in air | 8/3/17 | 30 | airKick0-1 |
| F+H string 1 | Forward+Heavy | 10 | 24 | flyKick0 |
| F+H string 2 | Heavy | 11 | 32 | aim0-1 |
| F+H string 3 | Heavy | 13 | 44 | arc4-5 |
| Aura Read | Charge | 12/24/12, cd 240 | 0 | ground2, arc7 |
| Deltamax Check | Special | 15/1/24, cost 12 | 36 (shot) | aim0-2 + fx_beam1 |
| Acrobat Step | Forward+Special | 14/3/4 → 4/3/20, cost 18 | 20+28 | acro2-4 |
| Marked follow-up | Heavy ≤10f after Acrobat recovery (clean hit, marked) | 6/3/20, +5 cost | 20 | kick1-2 |
| Rising Arc | Down+Special (ground) | 10/10/24 + landing 16, cost 18 | 40 | jump0, airKick1 |
| Read and Retreat | Back+Special | 6/8/18, cost 12, ≤90px back | 0 | arc1-3 |
| Heel Return | Down+Special (air) | 12/40/1 + landing 24, cost 15 | 44 | airKick0 |
| Phase step | double-tap Forward/Back | SPD Blue ground-teleport contract defaults (120px) | 0 | streak FX |
| Zord Assault | Ultimate | **disabled**: shared Zord absent; press consumed, no meter spent | — | fire0-2 reserved |

## Variety pass (2026-11-13, owner request; Red used as the model, not modified)
| Input | Move | Raw | St/Act/Rec | Notes |
|---|---|---|---|---|
| Down+Heavy | gSweep Floor Sweep | 38 | 11/3/24 | low, knockdown (Down+Light stays gLow) |
| Back+Heavy (neutral) | gEvade Backward Roll | 0 | 1/14/20 | 100px back, invulnerable 7f, no hitbox, free |
| air Special | gAirShot Air Deltamax | 30 | 10/1/16 | cost 10, downward shot, once per airtime |
| Up+Special | gSomer Somersault Read | 44 | 9/4/22 | cost 15, launcher (launchVy −26), no invulnerability |
| ↓↘→+Special on YOUR marked foe | gRush1 → gRush2 → gRush3 Read Rush | 18 / 18 / 26 | 9/2/3 · 3/2/3 · 4/3/24 | cost 25, consumes the mark, last hit knocks down; a blocked stage ends the string with an 18f stop. Unmarked: Acrobat Step |
| Forward+Light | gElbow Step-in Elbow | 30 | 9/3/14 | 32px advance, about even on block, special-cancellable |
| ↓↙←+Special | gArc Arc Kick | 46 | 14/10/22 | cost 20, carries 120px over the active frames (swept, stops at the body), knockdown |
Strips: gArc [crouchReady0,arc1,arc2,arc3] · gSweep [ground0,ground1] · gEvade [fall3,fall4] · gAirShot [airAim0] · gSomer [ground0,acro1] · gRush1 [acro0] · gRush2 [kick0,kick1] · gRush3 [flyKick0]. All are real sheet cells. Skins were rebuilt. See `docs/rangers/VARIETY_PASS.md`.

Roster-parity pass (2026-11-13): HP 980→1120; all authored damage ×1.7 (`SPD_GREEN_DAMAGE_SCALE`). See `docs/rangers/ROSTER_PARITY_PASS.md`.
