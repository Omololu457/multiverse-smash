# MSV1-SUKUNA — Credits

**Ryomen Sukuna (Shinjuku Arc) sprites by Mrfresh, Zeltas Black, Mps, Kenny, Dark night and Dr animation**
(the names credited on the sheet itself).

* Sheet: 964×1472, flat green key RGB(34,177,76), SHA-256 `c5772b85ae7451d7…`. It is kept unchanged in
  `assets/incoming/sukuna_shinjuku/sukuna_shinjuku.png`.
* Excluded from the game: the two portraits and the credits text (top-right block). Every other frame is used (`LEDGER.md`).
* Every game file cut from it lives in `assets/sukuna_shinjuku/**`: strips, effect sprites, portrait, the Edo Tensei
  `__edo` copies and the premade skins.
* In-game: `credits.js` → `SOURCED_ART.sukuna_shinjuku` (Credits screen and the select-screen artist line).
  Root `CREDITS.txt` carries the same line.
* Malevolent Shrine (background, theme, incantation) and the voice / slash sounds are the old Sukuna's assets, shared
  and credited under `sukuna`.
* **Technique effects** (animated strips in `assets/sukuna_shinjuku/fx/`, built by `tools/sukunashinjuku/fx_import.py`;
  sources kept unchanged in `assets/incoming/sukuna_shinjuku/fx/`):
  * Slashes (Dismantle, Cleave / Dismantle contact, World-Cutting Slash): **"Attack Effects Pack" by Game Developer Studio**
    (gamedeveloperstudio.com) — cyan originals keyed off their board and repainted crimson / white.
  * Fuga fire (gather embers, flame arrow, eruption, fire patch): **boltanim** — "fire eruption", "fire explosion" and
    "fire charge" MUGEN effect sheets, colours kept.
* Jujutsu Kaisen and its characters belong to Gege Akutami / Shueisha. Non-commercial fan project.

* **Ten Shadows shikigami** (Gama, Nue, Divine Dogs, Orochi, Datto, Divine Dog: Totality, Max Elephant, Mahoraga): drawn straight from the
  *Megumi Fushiguro JUS* sheet by **xxniiroxx**, using the strips already in `assets/megumi_fushiguro/summons/` (not copied). The Chimera
  Shadow Garden floor is the same sheet's domain strip with Megumi's pixels removed (`tools/sukunashinjuku/shadows_import.py` →
  `assets/sukuna_shinjuku/ten_shadows/domainFloor.png`). No Megumi body sprite is used.
