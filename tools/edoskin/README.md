# tools/edoskin — MSV1-EDO premade "Edo Tensei" skin (offline, deterministic, re-runnable)

```
node tools/bloodmap/enumerate.mjs tools/edoskin/defs.json   # every sheet each character can draw (not committed: 5 MB, reproducible)
python3 tools/edoskin/gen.py [--only k1,k2]                 # <sheet>__edo.png beside every default + form sheet → report/<id>.json
node tools/edoskin/portraits.mjs && python3 tools/edoskin/gen_portraits.py   # select-screen <portrait>__edo.png
python3 tools/edoskin/emit_keys.py                          # edoSkinKeys.js (characters that HAVE Edo art)
python3 tools/edoskin/verify.py                             # dims / alpha / outline / effect-pixel checks → verify.json
python3 tools/edoskin/sheets.py                             # docs/msv1/edo/sheets/<id>.png contact sheets
python3 tools/edoskin/ledger.py                             # docs/msv1/edo/LEDGER.md
node tools/edoskin/framedata.mjs <root> <out.json>          # frame-data snapshot (before / after diff must be zero)
node harness/edo_skin.test.mjs [--render --keys a,b | --boot | --sim-only --root DIR]
```

* `eligibility.json` — class per character (HUMAN / MASKED / NONHUMAN / ALREADY_EDO / TOBIRAMA), reasons, exclusions.
* `overrides.json` — hand fixes (listed in docs/msv1/edo/LEDGER.md): `addSkin` / `notSkin` / `notBody` colours, `cracks`.
* Reuses the MSV1-BLOOD body maps (data/bloodmaps/<id>.json) for per-frame landmarks (crack anchors, eye box) and
  tools/bloodmap/build.py's body / skin / face masks. Nearest-neighbour, palette-exact, no randomness (crack layout =
  sha256 of the character id).
