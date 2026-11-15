# Cyborg — canon and adaptation

**Character.** Cyborg is Victor Stone, from DC Comics / Teen Titans. The DC reference (https://www.dc.com/characters/cyborg) describes his cybernetic body as giving him technological weaponry and super-strength.

**Source art.** The supplied Game Boy Advance *Teen Titans* playable-character sheet, credited "Mr. C" on the sheet.

**Roster entry.**
- Universe: `dc`
- Archetype: Thermal Bruiser / Artillery
- Tagline: "Bring the noise."

## Taken from canon or the source sheet

| Element | Basis |
|---|---|
| Sonic cannon, shot and sustained | Arm-cannon transform; the sheet has "Shooting Sonic Cannon" with a loop marker and "Sonic Cannon Blast" |
| Missiles, straight and rack | Shoulder / arm launchers; the sheet has "Shooting Missile", "Launching Missiles (loop 5 times)", "Missile" and "Missile Explosion" |
| Mega Punch | The sheet's "Mega Punch" sequence; canon super-strength |
| Thruster reboost | The sheet's "Double Jump" (thruster burst) |
| "BOOYAH" | His catchphrase. It appears only as the ultimate's name and cut-in title: no spoken dialogue, no voice clip |
| Health-icon expressions, cut-in bust | Supplied GBA HUD art (eye and mouth overlays come from the sheet) |

## Original gameplay adaptations (not canon claims)

- **Heat.** Weapon emissions build Heat, which brings overheat, the vent and the WARN zone. This is a game-system abstraction of a heavy weapons load, not a canonical power.
- **Sonic Resonance and Hot Impact.** Original synergies that link his sonic weapons to his missiles, and his heat to his punches.
- **Power.** The roster-wide energy bar.
- **Weight 1.15.** Represents his heavy body.
- **Ultimate "BOOYAH PROTOCOL — FULL SYSTEMS IMPACT".** An original sequence that strings his canonical weapons together.

## Deliberately excluded (per the brief)

- **Technopathy / hacking.** No opponent-control or HUD-disruption effects.
- **Flight.** The thruster is a single bounded reboost per airtime, never sustained flight.
- **Boom Tube / teleportation.** None.
- **Self-repair / regeneration.** None.
- **Invented dialogue.** No quips or voice lines. Every sound is a synthesized SFX (`cyborg_*`).

## Skins

There are eight cosmetic palettes and materials, with Victor's human-skin pixels preserved exactly in every strip (tested). Six are inspired palettes that nod to other armoured characters without copying their art:
- Stark Circuit
- War Machine
- Blue Bomber
- Autobot Vanguard
- Alien X
- Upgrade

Two are original: Aurora Alloy and Disco Chrome. The classification for each skin is in `cyborgSkins.js` and `docs/skins/cyborg/skins_results.json`.
