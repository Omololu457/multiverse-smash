# Dash Parr — Sprite Ledger

Source: `assets/dash_parr/source/dash_sheet.png` (byte copy of the supplied untracked
`Game Boy Advance - The Incredibles - Playable Characters - Dash.png`, 191×298, SHA-256
`91d292df…2c55`). Credit text on the sheet: *"Ripped by redblueyellow. No credit needed."* (rows y ≥ 268,
excluded from animation; credited in `credits.js` anyway).

Cut by `tools/dash_parr/extract.py`: exact corner teal `RGB(0,128,128)` keyed with zero tolerance; 8-connected
components; a speed streak touching Dash is one component; satellites (2 ground shadows, 10 white dust specks)
are attached to their frame, so **all 13 102 non-background pixels above the credit are kept** (asserted).
Anchor = feet baseline + body-centre column, measured on body pixels only (white streaks and grey shadow never move it).
Render: exact ×2 nearest-neighbour (`spriteScale 2/1.18` × the engine's `GLOBAL_SPRITE_SCALE 1.18`). That makes him
about two-thirds of Elastigirl's on-screen height (screenshot `visual_12_vs_elastigirl.png`), so he reads as a kid
next to the adults. Violet isn't in the roster, so the "~75 % of Violet" target was matched against her mother instead.
The hurtbox stays at the roster-standard size: scale is cosmetic only and doesn't change hit interactions.

Contact sheet: `docs/dash/contact_sheet.png` (label `row.frame name`, red cross = anchor).

## The brief's inventory vs the real sheet

The real sheet is close to the brief but not identical; **the real frames win**:

| Row | Brief | Real |
|---|---|---|
| R1 | 1 portrait | 1 portrait (painted head icon) |
| R2 | 5 standing | **6** standing (subtle breathing loop) |
| R3 | ~7 running | **6** full-stride run frames (+2 detached ground shadows) |
| R4 | ~8 sprint / jump-run | **9**: 2 upright strides, 5 crouched hop / landing poses, 1 tall stretch, 1 horizontal dive |
| R5 | ~5 running / landing | **4** low forward-lean runs |
| R6 | ~4 streaks + poses | **4**: 2 white-streak frames (Dash inside the wake) + 2 blur poses, + 10 dust specks |
| R7 | ~4 flash / tumble / lying / crouched | **5**: white flash silhouette, face-down lying, upside-down tumble, bent-over crouch, excited leap |

## Every frame → animation(s) → move(s)

| Frame | Reads as | Animation strip(s) | Used by |
|---|---|---|---|
| 1.1 portrait | head icon | `portrait.png` (×3) | HUD + select portrait (all skins) |
| 2.1 stand0 | standing | idle, getup (last), win (last), intro (last) | idle, get-up, win pose, intro |
| 2.2–2.6 stand1–5 | standing | idle | idle loop (crouch has its own frame, below) |
| 3.1 run0 | stride | walk, run, walk_back, laps | walk (slowed), run, back-walk, **Laps loop** |
| 3.2 run1 | stride | walk, run, walk_back, laps | same |
| 3.3 run2 | stride | walk, run, walk_back, laps, panic | same + **Panic Run** |
| 3.4 run3 | big stride | walk, run, walk_back, dash, blurDash, sidestep | dash, **Blur Dash** recovery, **Sidestep** recovery |
| 3.5 run4 / 3.6 run5 | stride | walk, run, walk_back, laps | walk/run/Laps |
| 4.1 sprint0 / 4.2 sprint1 | upright strides | run (lead-in), light (=jab) | run start, **Jab** (startup → strike lean) |
| 4.3 sprint2 | hop start | intro | intro |
| 4.4 sprint3 | crouched hop | jump | jump (second frame) |
| 4.5 sprint4 / 4.6 sprint5 | crouched landing | fall | fall |
| 4.7 sprint6 | lunge stride | dash, heavy, laps | dash, **Heavy** startup, Laps |
| 4.8 sprint7 | tall stretch | jump, up (=launcher) | jump rise, **Launcher** active |
| 4.9 dive | horizontal dive | hydro, panic | **Hydroplane** finish, **Panic Run** |
| 5.1 lean0 | low lean | up (=launcher), blurDash, hydro | **Launcher** startup, **Blur Dash** startup, **Hydroplane** |
| 5.2 lean1 | low lean | crouch, hydro | crouch, Hydroplane |
| 5.3 lean2 / 5.4 lean3 | low lean | low, hydro | **Low slide**, Hydroplane |
| 6.1 streak0 | Dash inside a white wake | heavy, blurDash, flurry, ultimate | **Heavy** active, **Blur Dash** active, **Flurry**, **Incredi-Rush** |
| 6.2 blurPose0 | blur pose | air, flurry, ultimate | **Air**, Flurry, Incredi-Rush, Rush storm ghosts |
| 6.3 streak1 | white wake (2nd) | air, blurDash, flurry, ultimate, sidestep | Air active, Blur Dash, Flurry, Rush, **Sidestep** |
| 6.4 blurPose1 | forward blur pose | flurry, ultimate | Flurry, Incredi-Rush |
| 7.1 flash | white hit-flash silhouette | hurt | hit reaction frame 1 |
| 7.2 lying | face-down | knockdown, getup, lose | knockdown, get-up, lose pose |
| 7.3 tumble | upside-down tumble | hurt, knockdown | hit reaction frame 2, knockdown |
| 7.4 getup | bent crouch | guard, getup | **block** (crouched guard), get-up |
| 7.5 airPose | excited leap | win, ultimate | win pose, Incredi-Rush finish |
| shadows ×2 | ground shadow | attached to run0 / run3 | (part of those frames) |
| specks ×10 | white dust | attached to streak0 / streak1 | (part of those frames) |

Every frame is used at least once (the extractor asserts it).

## Attacks built from non-attack art (said per move)

The sheet has **no punch or kick poses**. Every attack is assembled from movement frames + the supplied white
streak frames + render-only code-drawn speed lines / afterimages. No art was invented or drawn.

| Move | Frames | Render-only additions |
|---|---|---|
| Jab | R4 sprint0 → sprint1 (upright stride as a lean-in) | — |
| Heavy | R4 sprint6 lunge → R6 streak0 | white horizontal speed lines during the lunge |
| Low | R5 lean2 → lean3 (low lean slide) | — |
| Launcher | R5 lean0 → R4 sprint7 (rising stretch) | — |
| Air | R6 blurPose0 → streak1 | — |
| Flurry | R6 blurPose0/1 + streak0/1 loop | short white fist-streak lines in front |
| Blur Dash | R5 lean0 → R6 streak0 → streak1 → R3 run3 | speed lines + afterimage trail (supplied frames re-drawn at past positions) |
| Laps | R3 run0–5 + R4 sprint6 loop, drawn circling the target | white arc speed-ring; real body hidden during the loop |
| Hydroplane | R5 lean0–3 → R4 dive | low speed lines + afterimages |
| Incredi-Rush | R6 blurPose/streak + R3 run frames at hashed positions around the target, R7 airPose finish | speed-ring + ghost ring; real body hidden during the storm |
| Sidestep | R6 streak1 → R3 run3 | white flash + afterimages |
| Panic Run | R4 dive → R3 run2 | afterimages |
| Blur tier | current pose | afterimage trail of R3 run frames (render-only memory, never in GAME_STATE) |
