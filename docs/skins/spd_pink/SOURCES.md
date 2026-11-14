# S.P.D. Pink skins — sources & method
- Generator: `tools/spd_pink/build_skins.py` (deterministic). It writes `assets/spd_pink/skins/<id>/*`, `skins_contact.png` and `region_mapping.json`.
- Every skin is classified **Inspired Palette**. Default is unchanged.
- Skins: Alien X (`spdPinkAlienX`, uses the shared Alien X starfield), Diamondhead, Upgrade, Heatblast, Chromastone (deep-violet ramp with lavender trim, deliberately moved away from pink), SPD Shadow.
- Regions: a 7-step pink ramp, 3 light trims, black and grey, plus a weapon-blob rule.
- Known limitation: the helmet and suit cloth share one ramp, and the gloves and trim share one.
- The Iron Reserve indicator is steel for **every** skin (tested), so it is never mistaken for skin colour.
- Rebuilt after the variety pass, so every skin carries the new strips (47 sheets per skin).
- Palette references: Ben 10 Fandom pages returned 402, so the colours were picked from general knowledge of the designs. Chromastone references were partial.
