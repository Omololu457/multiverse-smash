# Homelander Sprite Ledger

Source: `assets/source/homelander_original.png` (476×793, copied byte-for-byte from the
attached sheet `homelander_sprites_by_xxultra2006xx_dfad92z.png`, sha1
`7b75c8bf…`). Artist credit: **xxultra2006xx** (DeviantArt id `dfad92z`). No sprite art
was painted or invented — every pixel is from the original sheet; all beams, shockwaves,
speed lines, sonic rings, glows and particles in-game are code-drawn.

## Extraction method
- **Background strip:** pure-yellow key, tight mask `R>235 & G>235 & B<95` so blonde hair
  and tan skin survive (hair is ~tan, not pure yellow).
- **Dividers:** the black vertical lines are animation separators, *not* art. Removed as
  dark connected components that are thin (`w≤4`) and tall (`h≥25`). The black
  **silhouette** frame (3.5) is wide, so it is correctly kept as a sprite.
- **Frame cut:** connected-component labelling on the foreground, small motion fragments
  (barrage fists / blue streaks, area<300, gap<14px) attached to their parent body,
  rows clustered by y-centre, the merged bottom band split at the vertical gap.
- **Eye anchors:** per frame, glowing red/pink eye pixels in the top-45% head region give
  the beam origin (`eye_method:"eye_glow"`, 65/68 fireable frames); otherwise the skin
  (face) centroid is the fallback. Stored in `homelander_inventory.json` as `eye_anchor`
  = `[x,y]` offset from each frame's bbox top-left, in source pixels.

Outputs:
- `assets/source/homelander_inventory.json` — 79 frames, per-frame bbox + eye anchor + fireable flag.
- `assets/source/homelander_contact_sheet.png` — 3× labelled (`row.col`) contact sheet.
- `assets/source/homelander_eye_anchors.png` — 3× overlay: fireable frames (cyan), beam origin dot + direction.

## Frame inventory (79 frames, 11 rows)

| Row | Count | Content (verified against the sheet) | Engine role (Phase 2–3) |
|----|----|----|----|
| **1** | 7 | **1.1–1.3** hover/float idle (cape flowing) · **1.4** landing crouch · **1.5–1.6** cape-flip turn · **1.7** tall standing cape-up (turnaround/wrap) | `flyHoverIdle`, `land` (soft-landing recovery), `turn` (cape-flip, used on flight direction reversal), standing turnaround |
| **2** | 7 | **2.1–2.3** horizontal FLYING (body flat, arms forward) · **2.4** diving · **2.5** rising · **2.6–2.7** cape twirl | `flyCruiseA` (3-frame cruise cycle), `flyDive`, `flyRise`, `capeTwirl` (air-dash / cape-spin air normal) |
| **3** | 8 | **3.1–3.4** FLEX, eyes progressively redder (HEAT-VISION CHARGE) · **3.5** black SILHOUETTE, red eyes · **3.6** TAKEOFF (red blast streak under feet) · **3.7–3.8** rising launch | `heatCharge` (4-frame startup; also Flex taunt/parry pose), `ultSilhouette` (FLIGHT 37 dark-startup, invuln window), `takeoff`, `launchRise` (post-takeoff ascent) |
| **4** | 8 | ground punches + cape-sweep attacks (blue swoosh = cape hit FX) | ground normals: `jab`, `straight`, `capeSweepL/M`, `capeSwipe` (light/heavy string frames) |
| **5** | 9 | kicks (one with blue/red flame trail), lunges, heavy cape-wrapped punch | `kickL`, `kickH`, `lunge`, `heavyCapePunch` (command heavy / throw-adjacent) |
| **6** | 9 | SUPER-SPEED BARRAGE: multiple red fists + blue speed streaks (windup→barrage→recovery) | `barrageStart`, `barrageLoop` (×3-4 advancing flurry), `barrageEnd` (launcher) |
| **7** | 8 | more ground strings | extended normal string / target-combo frames, `sonicClap` wind-up pose |
| **8** | 6 | grab / lift poses | `grabStart`, `lift`, `carry` (Take A Ride / command grab), standing throw |
| **9** | 8 | aerial cape spins / flips | air normals + `airThrow`, `flip` (used by Take A Ride ascent & Supersonic air) |
| **10** | 5 | **10.1–10.4** horizontal FLYING (longer cruise cycle) · **10.5** hovering idle | `flyCruiseB` (4-frame fast-cruise cycle, speed-scaled frame rate), extra `flyHoverIdle` |
| **11** | 4 | **11.1–11.2** hurt · **11.3** fall · **11.4** knockdown (lying flat) | `hurt`, `fall`, `knockdown` (also LOSE pose & GROUNDED state) |

### Fireable frames & eye anchors
- **68 of 79** frames flagged `fireable:true` (upright enough to aim Heat Vision; the 11
  flat lying hurt/fall/cruise frames are `false`). Eye anchors are stored for **all** 79
  frames regardless, so the air-laser can still originate from the eyes on flying frames.
- The glowing-eye detector locked onto real eye pixels on **65** fireable frames; the
  other 3 (incl. the all-black silhouette 3.5) use the skin/head-centre fallback.

### Unused-frame audit (goal: zero waste)
Every row maps to at least one engine role above. The cape-twirl (2.6–2.7), flips (row 9)
and the second cruise cycle (row 10) are all consumed by flight animation selection and
air normals. The only frames not on a *mandatory* path are a couple of redundant string
frames in rows 4/7 — these are kept as alternate combo frames (no frame discarded).
Final per-animation PNG slicing happens in Phase 2/3 plumbing; this ledger is the map.
