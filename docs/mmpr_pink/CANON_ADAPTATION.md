# Pink Ranger — canon notes and game adaptation

**Canon.**
- Kimberly Ann Hart, the original Pink Mighty Morphin Power Ranger. She is a gymnast, and her weapon is the **Power Bow**.
- Her Thunderzord is the Firebird. Her original Dinozord is the Pterodactyl, and her Ninjazord is the Crane.
- The **Thunder Megazord** is the *team's* combined Thunderzord formation. It is not Kimberly's private Zord.

**Supplied art.** Sega Genesis *Mighty Morphin Power Rangers: The Movie* sheets, ripped by Belial:
- Pink Ranger (credit "Sprites (shamefully) ripped by Belial.")
- Thunder Megazord (credit "Sprites Ripped by Belial")

Both GIFs are preserved unmodified. Their hashes are in `source_rects.json`.

## Canon-faithful

- **Power Bow** with the sheet's own four-frame draw/release sequence and its own arrow.
- **Gymnastic kit.** Palm snaps, crescent kicks, the sliding sweep and the rising heel come from the sheet's cells.
- **Crane Escape.** The backward cartwheel nods to her Crane Ninjazord.

## Game adaptation (explicit)

- **Thunder Megazord as team support.** It is presented as "Thunder" assist orders that Kimberly *calls*. No text calls it her own Zord. It uses the shared sortie scheduler (`falconzord.js`): it has no HP, never body-blocks and never tracks.
- **Spotter Link, Thread the Needle and Spotter's Reflex** are game mechanics, not canon powers.
- **The long two-handed weapon pose (`staff0`)** is not identified as the bow, so it stays unused.
- **No air bow**, because the sheet has no airborne bow pose.
- **Teleport (blink)** is the shared Ranger-framework mobility option (`rangers.js`), not a canon power.
- **Six "Crossover Inspired Palette" skins** are colour interpretations, taken from Ben 10 aliens, on the unchanged Pink Ranger pixels. Each entry carries its source and caveat in `mmprPinkSkins.js`. They are never another Ranger's palette, and the Thunder Megazord is never recoloured.
- **Sound is SFX-only synthesis.** There is no dialogue and no voice clips.
