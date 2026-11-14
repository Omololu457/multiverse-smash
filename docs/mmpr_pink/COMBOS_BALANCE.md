# Pink Ranger — measured combos, pressure and counterplay

Every number below is **measured** by `harness/mmpr_pink.test.mjs` against a standing training dummy. The results are recorded in `docs/mmpr_pink/mechanics_results.json`. No matchup ratios are invented.

**Damage lever.** `MMPR_PINK_DAMAGE_SCALE = 1.7`. The engine scale is measured at 0.586, so a first hit lands at about the raw number. **HP 950.**

## Routes

| Route | Hits (HP) | Total | True combo | Resources |
|---|---|---|---|---|
| J1 → J2 → J3 | 17 / 21 / 27 | **65** | yes (also mirrored) | — |
| Forward+Heavy chain (palm → kick → knock-away) | 24 / 29 / 37 | **90** | yes | — |
| Forward+Heavy chain → confirmed Up+Heavy launcher | 24 / 29 / 35 | **88** | yes | — |
| Light → Heavy → Quick Shot | 17 / 55 / 28 | **100** | yes | 10 Energy |
| Rising Heel → manual jump → Flying Heel | 42 / 25 | **67** | yes | — |
| Thunder Line at the default point | 49 | 49 | — | 15 + pip |
| Sky Splitter at the default point | 18 / 30 | 48 | yes | 18 + pip |
| Returning Edge at the default point | 51 | 51 | — | 15 + pip |
| Light → Heavy → **Heaven's Final Arrow** (close confirm) | 17 / 55 / 28 / 38 / 30 / 34 / 102 | **304** | yes (7 hits) | 100 Energy |
| Heaven's Final Arrow, raw point blank | 30 / 46 / 36 / 40 / 122 | **274** | yes | 100 Energy |
| Arrow → Spotter Link → Thunder Line (marked) | 30 / 49 | 79 | **no** — set-up, not a combo | 10 + 15 + pip |
| Marked Sky Splitter → air conversion | 30 / 18 / 28 | 76 | **no** | 10 + 18 + pip |
| Sky Splitter twice in one juggle | 18 / 30 / 28 | 76 | — | the second launch is **refused** (one assist launcher per combo) |

## Pressure

- **Returning Edge vs held guard.** The descending slash is blocked (16 f blockstun, 12% chip).
  - An arrow arriving inside that blockstun connects. This is because this engine drops `isBlocking` during blockstun, a pre-existing engine rule also seen in the Black build.
  - It is recorded as measured and was not changed.
- **Spotter's Reflex.** After a committed call, Kimberly can cancel the call recovery into one neutral bow.
  - An arrow that hits during the contact window grants Thread the Needle: Down+Special in the last 6 f of bow recovery becomes Crane Escape.
  - Measured working delays: 3–7 f after commit.

## Resources (measured)

- **Pip recharge is sequential.** Two spent pips come back at frames 134 and 344 after the measuring start (210 f each, one at a time).
- **Lockout.** 75 f between sorties. After the ultimate, ordinary assists stay locked for 120 f.
- **Crane Escape.** 90 px, 31 f total, 12 Energy (passive regen ~0.06/f offsets the measured spend).

## Counterplay

- **Calls are interruptible.** The 14 f call startup is vulnerable. Hitting Kimberly before commit wastes her pip and Energy, and no Megazord appears.
- **Warnings are visible.** The Megazord never tracks. Every sortie strikes the point captured at acceptance, after a visible warning of 16–28 f. Walk out, or block: every sortie is a mid, none is an overhead.
- **Arrows are limited.** Only one arrow per owner can be on screen. Arrows don't pierce or go through walls, and they never target offscreen. The Drawn Shot takes 24 f to arm.
- **Air approach.** Kimberly has no air bow and only one jump.
- **Crane Escape is not a reversal.** It has no invulnerability, so its 18 f recovery is punishable.
- **Ultimate.** A whiffed or blocked opener leaves 60 f of recovery.
