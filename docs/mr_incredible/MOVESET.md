# Experienced powerhouse

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

Both grabs have visible startup and miss recovery. Range is 70 world px, at most 42 px of foot-height difference, grounded,
facing and local. Shared resolveGrab supplies tech rules, a finite 28-tick hold,
combo restrictions and release. Damage is snapshotted with shared offense and
defense before the shared ×.60 throw path. No remote capture or indefinite hold.
