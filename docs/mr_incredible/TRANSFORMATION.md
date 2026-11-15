# Back in My Prime

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
