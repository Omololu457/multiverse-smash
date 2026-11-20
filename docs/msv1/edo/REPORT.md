# MSV1-EDO REPORT

Start commit: eb24611ede50b6a2499c49c9e67b463cdadcf7a3

- Classes: HUMAN 80 · MASKED 25 → **105 Edo skins**. NONHUMAN 4 (beerus, vilgax, arlong, naruto KCM) · ALREADY_EDO 1 (madara) · TOBIRAMA 1 · EXCLUDED 3 (albedo, ghostface, kevin_levin — not on main yet).
- Automatic 101 · hand-fixed 4 (beast_boy, cyborg, genos, samurai_red_ranger — tools/edoskin/overrides.json).
- Eyes skipped (HUMAN, no separable whites): dash_parr, enoch, green_arrow. MASKED: n/a.
- Crack exceptions: fewer than 3 face cracks where the face is small/masked/painted (itachi 0, kakashi, inosuke, mayuri, isshiki …; see LEDGER).
- Skin detection: per-character calm-frame palette; a colour is skin if ≥60% of its pixels fall in the MSV1-BLOOD body-map skin mask, it appears inside the face box, and it is not mostly above the face (hair). MASKED: also sat < 0.55. Recolour only inside the per-frame body mask; outline-less effect patches skipped.
- Ledger: docs/msv1/edo/LEDGER.md · contact sheets: docs/msv1/edo/sheets/<id>.png · screenshots: docs/msv1/edo/screenshots/
- Assets: 2,988 `__edo.png` files, 24.3 MB; loaded only when the skin is picked (Tobirama vessels warmed on assignment). Edo sheets average 95% of default size.
- Verify: 2,883 sheets · dims/alpha/outline fails 0 · non-body pixels changed 0.
- Tests (baseline → final): determinism 14/0→14/0 · combo-standard 233/9→233/9 · up-attack-roster 77/2→77/2 · credits 11/3→11/3 · roster_integrity ✅→✅ · replay_playback 10/0→10/0 · net_online 11/0→11/0 · edo_skin 19/0.
- Frame data: all 162 characters byte-identical; 0 existing skins changed; 105 Edo skins with timing identical to their character.
- Tobirama AI sim trace: identical to the start commit.
