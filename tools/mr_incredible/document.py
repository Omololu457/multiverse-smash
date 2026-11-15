from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2];D=ROOT/'docs/mr_incredible'
L=json.loads((D/'source_rects.json').read_text())
def save(name,s):(D/name).write_text(s.strip()+'\n')
save('SPRITE_MAP.md','''# Mr. Incredible sprite map

The supplied originals are unchanged. Red Suit is 897 × 1666, keyed only at
RGB(173,214,214). Young is 1590 × 838, independently keyed at RGB(255,0,255).
Red annotation pixels RGB(255,0,0) are excluded; that exact color is not a suit ramp.
White attack arcs, pale suit highlights, skin ramps, emblem and black ink survive.
The Red Suit sheet credits Perseus. In-game attribution is in credits.js.

`source_rects.json` is the exact frame ledger: original filename, SHA-256,
source rectangle [left,top,right,bottom) for every frame, source root and output
placement. `segments.json` indexes row/group pairs in the two annotated inspect PNGs.
No assumption of equal source positions or frame counts is made.

Run `python tools/mr_incredible/segment.py`, then
`python tools/mr_incredible/build.py`. Use the project's Anaconda Python with
Pillow and NumPy; `/usr/bin/python3` does not have Pillow installed here.

Cells are 128 × 112. The root is (64,100); source feet are aligned there without
resampling. The engine uses uniform 1.8 scale for both forms. Horizontal roots
use the lower-body median with a full-rectangle constraint for horizontal hurt
poses. Below-root effect clearance is 12 source pixels. Source rectangles are
never clipped to fit: the builder asserts all four bounds. Young retains its
own silhouette, head, hair and proportions. Gameplay body stays 60 × 100 in
both forms, with the same move collision definitions.

Idle retains the authored red-sheet expression/loop section. Running is a visual
loop only. Every melee attack has one shared-engine hit latch, irrespective of
sprite loops, outlines, duplicate strikes or attached arcs. Detached white
bursts are separate `miBurst` / `miArc` strips; they never have damage boxes.
Shadows and silhouettes are retained as cosmetic strips. The Young shadow is
masked from the original foot-shadow pixels, not a second body image.

Interpretation notes: these sheets contain no move names. Guard is interpreted
from bracing poses; low is a low-targeted punch, not a kick. Upward arm sweeps
serve the launcher; tumbling strips serve Wrecking Ball alternatives. The white
outline versions appear to be powered impact variants; they are cosmetic and
never imply armor. `miDefeatAir` includes horizontal knockback imagery whose
original game-specific intent is uncertain. No claim is made that these are
canonical Incredibles move names or animation semantics.

See FORM_MAPPING.md for the action correspondence and all frame counts.
'''+ '\n\nSource hashes:\n\n'+ '\n'.join(f"- {f}: `{x['sha256']}`" for f,x in L.items()))
lines=['# Independent form correspondence','','Each row is one animation identity. Source references are independently recorded','in source_rects.json. Group numbers refer to inspect_veteran.png / inspect_prime.png.','','| Action / gameplay role | Veteran frames and groups | Prime frames and groups |','|---|---|---|']
for key,rs in L['veteran']['actions'].items():
 pr=L['prime']['actions'].get(key,[])
 def desc(r):return str(len(r))+'; '+', '.join(f'{a}:{b}' for a,b in sorted(set(tuple(x['group']) for x in r)))
 lines.append(f'| {key} | {desc(rs)} | {desc(pr)} |')
lines+=['','`mrIncredibleData.js` defines startup/active/recovery in integer simulation ticks.','Attack timelines bind startup, contact, recovery and final pose explicitly. Prime','changes recovery only; it preserves startup, active counts and the hit latch.','Wrecking Ball cycles through spin / tuck-roll / ground-spin art; Seismic Slam cycles','through ordinary / alternate / outlined landing art. These cached visual variants','use the same move data. Hurt/getup alternatives reuse the remaining reaction groups.','Detached effects / shadow / silhouette strips are presentation only; some are','retained for inspection and future result presentation rather than forced into combat.']
save('FORM_MAPPING.md','\n'.join(lines))
save('TRANSFORMATION.md','''# Back in My Prime

This is an original game adaptation. Mr. Incredible does not canonically de-age
on command. There is one selectable key: `mr_incredible`. Every match starts
veteran; cosmetic selection never changes simulation form or stats.

Full 100 Power and a fresh Ultimate press activate only while alive, unstunned,
not grabbed/knocked down, not attacking and off attack cooldown. Ground and air
activation are supported. Entry is a vulnerable 24-tick bracing pose with a
restrained local ring. No damaging activation blast, healing, immunity, max-HP
change or jump reset occurs. A hit can interrupt the pose, not extend the timer.

The 900-tick active-simulation timer starts on acceptance; this includes entry.
Shared global cinematic/KO freezes and pause do not advance it. Mr's local
hitstop consumes simulation time under the existing update loop. The UI shows
BACK IN MY PRIME, seconds remaining and the finite special reserve.

Bonuses: ×1.30 authored outgoing damage; ×1.15 ground movement; ×1.10 air control.
The engine sets walking velocity directly (there is no ground acceleration stat),
so its responsive velocity mapping is preserved. Speed 90 maps to 7.5 px/tick:
prime is 8.625 on the ground and 8.25 for ordinary air control. Shared physical
dash remains 12.1 px/tick. No speed stat is multiplied into the clamped conversion.
Recovery is ceil(base × .90), minimum 8 ticks, once at move creation. Startup,
active frames, hit IDs, grab tech and juggle caps are unchanged. No blanket
animation/timer speedup or attackSpeedMultiplier is used.

Resource policy: the engine has one Power pool for specials and ultimate. Entry
spends the full 100 and locks this ultimate pool at zero during prime; charge and
passive meter regeneration are gated. To make the requested prime special routes
playable, entry supplies a separate finite 100-point special-only reserve. It
cannot fund another ultimate, never regenerates, and unused reserve is discarded
on any return. It is shown explicitly in the HUD. This is a documented tuning
adaptation rather than a hidden refund to the ultimate meter.

Fresh R2 at least 30 ticks after activation returns early without refund. Held
R2 never cancels. Early return never touches attack state, jump count or combo.
At natural expiry bonuses cease before that tick's movement. Started attacks
retain their raw damage and recovery snapshot. Visual return waits until a safe
action/grab boundary; an abnormal state forces it within 90 ticks. No animation
loop can extend the boost.

State is plain JSON on `_mrIncredible`: tick, remaining, visual, pending return,
entry, reserve, activation tick, press history/edges, serial, rise allowance and
reaction presentation timers. `currentAttack.mr` snapshots raw damage, recovery,
prime flag, identity, contact latch and bounded-travel origin. `_grabThrowDmg`
snapshots the shared throw payload. Replay checkpoints include these fields.
LAN feeds the same raw controls; no separate pad poller runs over remote input.

KO, round reset, training reset, rematch and scene cleanup clear Mr-owned state
and refresh the selected skin's veteran map. Baseline stats are never mutated, so
repeated activations cannot compound them. Cosmetic skin IDs are not in this
simulation object and never affect GAME_STATE decisions.
''')
save('CONTROLS.md','''# Controls

Both forms use the same logical actions, player/device assignment and remapping.
All directions below are facing-relative. No global controller layout changed.

| PS5 | P1 keyboard | P2 keyboard | Action |
|---|---|---|---|
| Stick / D-pad | A / D / S | arrows | Move / crouch |
| Cross, fresh Cross | W, release W, W | Up, release, Up | Jump / free second jump |
| Square, fresh Square, fresh Square | J, J, J | 1, 1, 1 | Punch chain |
| Down + Square | S + J | Down + 1 | Low punch |
| Triangle | K | 2 | Heavy |
| Forward + Triangle | forward + K | forward + 2 | Advancing punch |
| Up + Triangle | W + K or I | Up + 2 or 3 | Launcher |
| Down + Triangle | S + K | Down + 2 | Low heavy / airborne down-air |
| Air Square | air J | air 1 | Air strike |
| Circle | ; | / | Shared guard |
| L1 | O | 6 | Standard grab |
| Forward + L1 | forward + O | forward + 6 | Power Lift |
| R1 | L | 4 | Incredible Impact |
| Forward + R1 | forward + L | forward + 4 | Freight Train |
| Up + R1 | W + L | Up + 4 | Rising Power |
| Down + R1 | S + L | Down + 4 | Seismic Slam |
| Back + R1 | back + L | back + 4 | Human Wrecking Ball |
| L2 | hold P | hold 7 | Shared charge, disabled during prime |
| R2 | U | 5 | Activate / fresh eligible early return |
| Double-tap left/right | double-tap A/D | double-tap arrows | Shared physical dash |
| Options | Esc | Esc | Pause |

Priority: R2 → legal clean-hit chain/cancel → grab → special → up-attack →
heavy → light. Special direction: Up > Down > Forward > Back > Neutral.
The shared pad reader also reports Up+Square as Up-Attack; that retains the
engine's launcher behavior. Air Triangle without Down uses Air Strike.

Attack edges are buffered at most 8 simulation ticks. A fresh press is consumed
once; holding Square cannot repeat the string. A release during hitstop arms the
next jump press, without replenishing jumps. Prime returns require an actual R2
release/repress after the 30-tick debounce. Buffered shared R2 levels are not
used for that decision. Up+R1 suppresses the jump. L2 never modifies this kit.

Validation uses keyboard events, logical raw input, simulated standard-gamepad
button indices and LAN injection. No physical DualSense was connected/tested.
''')
save('MOVESET.md','''# Experienced powerhouse

1250 HP, 100 Power, speed 90 (7.5 world px/tick), two jumps; no passive armor.
Attack 96 / defense 94 are roster metadata, as for peer bruisers. Live damage
uses shared offensive/defensive multipliers, combo curves and floor rounding.

| Move | Raw veteran | Raw prime | Startup / active / recovery | Cost |
|---|---:|---:|---|---:|
| Light 1 | 50 | 65 | 5 / 3 / 11 | 0 |
| Light 2 | 50 | 65 | 6 / 3 / 12 | 0 |
| Light finisher | 70 | 91 | 8 / 4 / 20 | 0 |
| Heavy | 100 | 130 | 14 / 4 / 24 | 0 |
| Low punch | 45 | 58.5 | 6 / 3 / 13 | 0 |
| Launcher | 80 | 104 | 6 / 4 / 8 | 0 |
| Air strike | 70 | 91 | 6 / 4 / 14 | 0 |
| Down-air | 95 | 123.5 | 10 / 20 / 22 | 0 |
| Forward heavy | 110 | 143 | 12 / 4 / 24 | 0 |
| Low heavy | 90 | 117 | 13 / 4 / 25 | 0 |
| Standard throw | 55 | 71.5 | 6f reach + shared 28f hold | 0 |
| Incredible Impact | 140 | 182 | 11 / 4 / 25 | 18 |
| Freight Train | 125 | 162.5 | 9 / 13 / 29 | 20 |
| Rising Power | 90 | 117 | 7 / 9 / 25 | 18 |
| Seismic Slam | 155 | 201.5 | 18f minimum / landing contact / 28 | 25 |
| Human Wrecking Ball | 135 | 175.5 | 10 / 14 / 27 | 22 |
| Power Lift | 145 | 188.5 | 12f reach + shared 28f hold | 20 |

Prime recovery only: ceil(recovery × .90), minimum 8. Hitstop and recovery remain
shared engine behavior; there is no universal armor. Fresh light presses after
clean contact and in recovery produce the three-stage punch chain. Heavy and air
clean contact may cancel into a fresh directional special. Misses/guard cannot
chain. Launcher retains the shared deliberate jump-cancel / juggle limiter.

Physical travel: Light 2 steps 14 px; Forward Heavy travels at most 55 px;
Freight Train at most 152 px; Wrecking Ball at most 84 px. Shared stage bounds
remain legal. Each has one target hit budget despite multiple animation frames.

Rising Power applies its lift at startup tick 6 rather than before the punch can
reach a grounded target. It is once per airtime, resets only on landing and does
not replenish either jump. There is no infinite air-special chain.

Seismic Slam hops on ground activation and accelerates downward from air activation.
Only a real grounded contact after at least 18 ticks opens a 3-tick impact window.
The total 155 budget combines direct contact and the small shared impact box;
there is no second damage-bearing shockwave. It reaches at most 140 world px
from the fighter center and 65 vertically near the feet. A failed/high landing
outside its bounded action produces no remote quake. Down-air similarly uses one
95-damage melee latch; landing art adds no damage.

Both grabs have visible startup and miss recovery. Range is 70 world px, grounded,
facing and local. Shared resolveGrab supplies tech rules, a finite 28-tick hold,
combo restrictions and release. Damage is snapshotted with shared offense and
defense before the shared ×.60 throw path. No remote capture or indefinite hold.
''')
save('SKINS.md','''# Paired cosmetics

Default plus ten alternatives. `mrIncredibleSkinTable.js` is the stable ID/name/
classification/effect table. `mrIncredibleSkins.js` caches both form maps for every
skin. Files are assets/mr_incredible/<tag>/{veteran,prime}/<action>.png.
Every pair has the same geometry, alpha, origin and action coverage as default.
Skin application refreshes only the active form map and preserves simulation state.

| Stable ID | Display / inspiration | Classification |
|---|---|---|
| default | Default (supplied Red Suit / Young) | Original supplied game pixels |
| mi_modern | PRIME / MODERN | Original controlled costume edit |
| mi_cosmic | ALIEN X / COSMIC STRENGTH | Ben 10 inspired palette |
| mi_superman | SUPERMAN / TOMORROW’S STRONGEST | Superman inspired palette, no cape/logo |
| mi_upgrade | UPGRADE / POWER CIRCUIT | Ben 10 inspired palette |
| mi_diamondhead | DIAMONDHEAD / CRYSTAL TITAN | Ben 10 inspired palette, no crystal anatomy |
| mi_heatblast | HEATBLAST / FURNACE FISTS | Ben 10 inspired palette, no flame damage |
| mi_cursed_rose | JJK / CURSED ROSE | JJK inspired pink hair / charcoal / burgundy palette |
| mi_infinity_blue | JJK / INFINITY BLUE | JJK inspired white hair / navy / cyan palette |
| mi_valkyrie | WINNING VALKYRIE / VICTORY FORCE | Custom Beyblade inspired palette |
| mi_golden_age | OBSIDIAN GOLD / GOLDEN AGE | Original obsidian / ivory / antique-gold palette |

The source palette classifiers and each output ramp are in build.py. Skin tones,
mask ink, anatomy and hair have separate masks. Hair changes are confined to
upper-frame gold hair pixels for Superman/JJK treatments. The source's black
fabric is distinguished from contour/face ink by enclosed costume-region masks.
Outline pixels, neighboring skin and transparency are protected. All full-body
frames are processed, including reactions and horizontal knockdowns.

PRIME / MODERN uses deep petrol teal with charcoal sleeve/side/inner-leg fabric.
The visible buckle ring is detected from its enclosed ink and removed, with the
belt and local shading reconstructed inside opaque cloth. It is not simply a
recolored buckle or a pasted rectangle. Trunks are brought into the same fabric
ramp. Matching veteran uses streamlined red and charcoal with an integrated gold-
free waist. The face, hair, mask and silhouette are unchanged. The original small
emblem remains. `modern_edit_masks.json` records pose rectangles and edit counts;
source/output comparisons and the reproducible algorithm allow inspection.

Visual reference researched: the [Homecoming Stark suit promotional image](https://hombredebronze.blogspot.com/2017/06/spider-man-homecoming-el-traje-de-stark.html)
and [the original suit auction photos](https://www.originalprop.com/blog/2017/12/11/screenbids-the-official-spider-man-homecoming-suit-auction-benefiting-toys-for-tots/).
Only integrated fabric panels and restrained trim inform the design: no spider
logo, web pattern, extra plating, thinner body or generated replacement poses.

ALIEN X covers both complete form maps, portrait and cosmetic impact treatment.
Obsidian fabric, cool silver emblem and sparse fixed cloth-only stars replace
teal/belt accent regions in young form. Exposed skin stays natural. Patterns
never use simulation RNG, Math.random, per-frame image decoding or pixel scans.
All alternate sheets are precomputed PNGs. Renderer images/maps are cached.
Stars are always static; reduced-motion presentation omits extra detached bursts
and retains quiet local rings. Shared engine effects remain shared.

Effects: violet-white cosmic; warm Heatblast; rose-violet Cursed Rose; green
Upgrade; mint Diamondhead; antique-gold Golden Age; cyan for Modern, Superman,
Infinity Blue and Valkyrie. Original white authored arcs remain intact. HUD reserve
and transformation readout use the selected accent. Portraits are precomputed;
HUD identity remains the selected veteran portrait through the transformation.
The skin menu previews veteran; skins_contact.png and modern_suit_comparison.png
provide the coordinated young-form previews. No unsupported automatic menu
transformation preview is claimed.
''')
print('Wrote source, form, transformation, controls, moveset and skin documentation')
