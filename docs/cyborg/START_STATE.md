# Cyborg build — start state

Recorded 2026-11-14 by the Cyborg session before any Cyborg edit.

## Repository
- Branch: `main` (no branch switch, pull, merge, stash, reset, clean or forced checkout during this build).
- HEAD at start: `5fa3bc8d6e84f217d82ea4f4c237556f61145cb5` ("White Ranger: Formation Crane Rise air conversion").
- Tracked tree at session start (10:27 EST): **clean**.
- Untracked at session start (not Cyborg's, never staged or touched by this build):
  - `Game Boy Advance - Teen Titans - Playable Characters - {Beast Boy,Cyborg,Raven,Robin,Starfire}.png` (supplied sheets; only the Cyborg sheet is read, never written)
  - `assets/spd_yellow/`, `docs/spd_yellow/`, `spdYellowData.js`, `spdYellowSprites.js`, `tools/spd_yellow/` — the concurrent S.P.D. Yellow session.

## Concurrent session (observed 10:41 EST, before Cyborg touched any shared file)
The S.P.D. Yellow session (peer `multiverse-smash-0a`) had added `spd_yellow`-gated hooks to 10 shared files.
These lines are **theirs**: Cyborg never edits, reformats or commits them. sha256 prefixes at 10:41:

| File | HEAD | Working tree (with SPD Yellow hooks) |
|---|---|---|
| characters.js | 2691cc30 | c445bcdb |
| combat.js | 5f192113 | 1b9e9537 |
| credits.js | 471728c6 | 4f8a5738 |
| game.js | ce9f2359 | 2970577c |
| input.js | 0f1c6179 | 08230f3d |
| kits.js | 4006a596 | 52aeff36 |
| skins.js | 49f24bdc | 5ed7d42d |
| sound.js | ae34b73b | 5d9f18e8 |
| sprite.js | 576206a4 | d09feef1 |
| spritesheets.js | 80782b9f | 2457be65 |

Coordination: a message was sent to that session at 10:42 describing every shared site Cyborg will touch
(append-at-end on the shared long lines, gated lines only, private-index commits).

## Existing Cyborg definitions
- No `cyborg` fighter existed (not active, not wiped, not disabled) — searched characters.js, skins.js, kits.js, game.js.
- Unrelated existing uses of the word, left untouched: Superman's "Cyborg Superman" skin (`supermanCyborg`, `superman_*__cyborg.png`,
  `drawCyborgSupermanEye`), Genos ("Demon Cyborg", One Punch Man), Green Arrow's EMP drain regex (`/…|cyborg/` on rosterKey —
  it will now also match the new `cyborg`: an EMP arrow hit drains 20 Power, same as other tech fighters).

## Source sheet
`Game Boy Advance - Teen Titans - Playable Characters - Cyborg.png` — 1369×1613, RGB, 230 741 bytes,
sha256 `7c0c882f1a235ee8599d9a512cbbb3e96b1974d7448a8c880bbf0e893a366f26`. Read-only; hash asserted by tools/cyborg/extract.py.
Attribution panel: "Brought to you by… Mr. C" — Credit? No / Permission? No.

## Files never touched
`naruto_seventh_kcm_jump_uniform.png`, all music / ratings / MP3s, other sessions' files.
