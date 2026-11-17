# Quality-of-life — ranked (2026-11-17)

Ranked by (how often a player hits it) × (how much it hurts) ÷ (effort / risk). "Exists" = already in the game
(checked in code, not assumed). ✅ = implemented in this pass (`harness/qol.test.mjs` 11/0).

| # | Item | Status |
|---|---|---|
| 1 | **Settings → Anime FX Off / Low / Full** with an explanation under the button. Off = no tell glint, ceremonies, signature-move breakdowns or level-ups. Low = glint + ceremonies, but colour flips become a soft dim, no screen splits, no signature floor scars. Full = everything. Saved (`ms_anime_fx`); presentation only, so LAN/replay-safe. | ✅ |
| 2 | **Pause → Move List** opens on *your* fighter (row scrolled into view); Back / Esc returns to the frozen match, not the main menu. | ✅ |
| 3 | **Pause → Restart Match** (rematch from round 1, same fighters/stage) and **Character Select** (keeps mode + stage). Same code paths as the results screen; offered in vs / pvp / training; refused with a toast in Tower / Arcade / LAN. | ✅ |
| 4 | **Training → dummy Record / Playback**: F9 records your inputs (≤10 s, stored as forward/back), F10 makes the dummy replay them on a loop turned to face you; F2 restarts the loop. Shown in the training panel. Uses the replay input path (`readRawControls` / `writeRawControls`). | ✅ |
| 5 | Pause menu now fits 12 rows on short windows (rows shrink instead of running off the panel). | ✅ |
| 6 | Training input display, frame data, frame advantage (on hit / on block), hitbox + hurtbox overlay, reset (F2), infinite HP/meter (F3), dummy stand/block/jump/combo/projectiles (F4) | Exists |
| 7 | Character select: search box, random pick, per-universe grid, skin select, on-screen Back | Exists |
| 8 | Controller: rebindable keys, Jump-on-Up per player, device-aware glyphs (Controls screen), stuck-input guard on round reset (`clearInputBuffers`) | Exists |
| 9 | Console errors / 404s — scanned 7 real AI matches across universes: **0 page errors**, only 404 = `/api/health` (no backend under the static test server; expected). | Checked, clean |
| 10 | Preload / perf: Graphics preset Low/Standard/Full, low-FPS auto-suggest chip (F9 applies Low), F8 perf overlay | Exists |

## Next (not done in this pass)

- **CPU coverage for the older anime kits.** The Phase 4 AI-vs-AI batch showed kits without kit-specific CPU logic
  lose almost every CPU match, whatever their stats (see `docs/rebalance_2026-11/CHANGES.md`). For single-player that is
  the biggest felt imbalance left, and it's AI work, not number tuning.
- Record/playback for a **controller** P1 on fighters whose raw snapshot is keyboard-only (records fine for keyboard
  and for the ~30 kits that read the pad directly).
- Two record slots + "random slot" playback; block-after-first-hit dummy option.
- Hover tooltips for every Settings row (the new Anime FX row has its explanation inline; older rows have one-line hints
  that clip at the right edge on narrow windows).
