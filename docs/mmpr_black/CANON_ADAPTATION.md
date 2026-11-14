# Black Ranger — canon notes and game adaptation

Sources checked (Phase 1): Ranger Central — https://www.rangercentral.com/database/1993_mightymorphin/rg-adam.php ; Morphin Legacy — https://morphinlegacy.com/legacy-database/movies/mmpr-movie-1995/movie-rangers/movie-adam-park/

**Canon (Ranger Central):** Adam Park; Shaolin kung-fu; shy, spiritual, disciplined fighter. Black Mighty Morphin Ranger and Black Ninja Ranger (later Green Zeo / Green Turbo). Zords: Lion Thunderzord, Frog Ninjazord, Black Shogunzord. Weapons: Power Axe (doubles as a cannon), Blade Blaster.

**Supplied art:** Sega Genesis *Mighty Morphin Power Rangers: The Movie* sheets (sprites ripped by Belial the Hedgehog), Black Ranger + Falconzord. Both GIFs are preserved unmodified; hashes in START_STATE.md / source_rects.json.

## What is canon-faithful
- Unarmed martial-arts kit built only from the sheet's own punches, kicks, acrobatics and sweeps (Shaolin striker).
- "Rising Mastodon" names the Black Ranger's Mastodon power coin lineage; "Crescent" kicks match the sheet's crescent/turning kick frames.

## What is an explicit GAME ADAPTATION
- **The Falconzord partnership.** The Falconzord is not Adam's Zord in canon (his Ninjazord is the Frog). The game pairs Black with the Falconzord as a scripted aerial assist because the supplied sheet provides it. It is presented as "Falcon sorties" called by Black, never as Black's own Zord in any text.
- **The Power Axe is not used.** The sheet draws the axe in four cells (axe0-3); the kit is unarmed and those cells are documented as unused rather than turned into new weapon geometry.
- **Teleport (blink)** is the shared Ranger-framework mobility option (rangers.js), not a canon power.
- **Six inspired skins** are colour interpretations borrowed from Ben 10 aliens on the unchanged Black Ranger pixels (each entry carries its source and caveat in skins.js / mmprBlackSkins.js).
