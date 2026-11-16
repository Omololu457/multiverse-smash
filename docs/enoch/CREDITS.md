# Enoch — credits

**Who he is.** Enoch is a tribute fighter for one of the people who helped build Multiverse Smash.

**Base art.** Game Boy Advance *The Incredibles* — playable-character sheet for Frozone
(`Game Boy Advance - The Incredibles - Playable Characters - Frozone.png`, SHA-256 34aeab73…, already in the repo and only
read). Original game art: THQ / Heavy Iron Studios. Sheet ripped by **redblueyellow**.

**Ripper caption.** The sheet carries the caption *"Ripped by redblueyellow. No credit needed."* It is **excluded** from every
frame (rectangle 322, 436, 382 × 35, see `edit_ledger.json`) and the ripper is **credited** here and in the in-game
credits (`credits.js`) anyway: *excluded, credit*.

**Edits.** Every frame and the portrait were recoloured by region with nearest-neighbour pixel edits
(`tools/enoch/build_sprites.py`, `tools/enoch/regions.py`, `tools/enoch/portrait.py`). Pixel counts per frame are in
`EDIT_LEDGER.md`; the before / after sheet is `compare.png`. No reference photo is in the repo, and none of its parts are
used anywhere. The shirt is plain navy with no logo.

**Effects and sound.** Patch, beam, steam and HUD effects are procedural hard-edged shapes (`enochFx.js`). The visor beam
is drawn with the same three-stroke algorithm Homelander and Superman use, now shared through `beam.js`. Sound effects are
synthesized (`enochSound.js`). The sustained laser is Homelander's existing beam loop, pitched up ×1.12. There is no voice
and no dialogue.

**Effect sheets (owner-supplied, render-only, cut by `tools/enoch/cut_vfx.py` into `assets/enoch/vfx/`).**
- Ice punch, fire charge, fire eruption, fire explosion, water splash, water drill MUGEN effect sheets — by **boltanim**
  (file names `…_by_boltanim_….png`): the ice bursts, rising fire, Fire Wall pillars, flame jet / puffs, water splash, fire cage.
- *Marvel vs. Capcom* (Capcom) — Iceman partner sheet, ripped by **Nemu** ("No credit needed. Don't claim as your own."):
  the ICE METEOR boulders and their shatter chunks. Credited anyway; the sheet's caption is not used.
- *Luminous Arc 2* (Marvelous) — "Fire Bullet", ripped by **d9rad** ("Credit would be nice. Do not steal!"): the FIRE METEOR
  comets, fireballs and impact / burning-ground frames.
- *Joe & Mac: Caveman Ninja* (Data East) — fire, ripped by **Vaati**: the growing flames of the fire-meteor impact.
- Blue ice sheets with icicles — stock vector illustration (`41940.jpg`): the icicle slabs (ice box lid, air ice slide).
  Check that stock licence before any public release.
- The SNOWMAN is drawn procedurally (`enochFx.js` drawSnow); no sheet.
