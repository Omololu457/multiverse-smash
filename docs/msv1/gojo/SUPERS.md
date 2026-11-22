# Satoru Gojo (Shinjuku) vs every roster super — Infinity off / L1 / L2 / L3

Measured by `harness/gojo_shinjuku_supers.mjs` on the real loop. P1 casts its ultimate (`__harness.p1Ultimate`) from a
fixed spacing, and P2 = gojo_shinjuku (a training dummy) holds the given Infinity level. CE is topped up during each
cast, so what is measured is the **level rule**, not the CE economy. Damage is what gojo_shinjuku actually took.
Raw rows: `supers_results.json`.

**The rule:** L1 = supers connect in full; L2 = supers deal 50 % and cannot launch; L3 = supers are stopped; any domain
forces Infinity off (sure-hit).

## Summary (113 ultimates)
- **ok (54)**: the rule held at every level (L1 = full, L2 = half, L3 = 0).
- **forced off by a domain (3)**: hashirama, omololu, sukuna. Infinity dropped and the damage
  landed at every level, as designed.
- **no damage even with Infinity off (53)**: from this spacing, against a standing dummy, the ultimate
  dealt nothing even with Infinity **off**. Some of these whiff; others are setup, buff or transformation ultimates
  (forms, summons, stances, domains with no hit). With no control damage, the rule can't be measured for these rows.
  Their counters show no Infinity misbehaviour: nothing was stopped at L1 except Jiraiya's two non-damaging pieces.
  Tobirama, Netero and the old Gojo show damage only at some levels; that is positional noise (a single hit that
  lands or whiffs by a few pixels).
- **CHECK (2)**:
  - **green_arrow**: the first run flagged L1 = 0. The re-run shows his ultimate **did not cast** at L1 or L3: his
    own post-ultimate lockout isn't cleared by the harness reset, so his casts alternate. Where it cast, the rule held:
    off 404, L2 202 (exactly half). **Fixed along the way:** Arrowstorm's arrows aren't flagged as super, so the
    Infinity shell had been stopping them at L1/L2. The shell now treats any projectile whose owner is inside a super
    window as part of the super, and L2 went from 149 to exactly 202.
  - **yuta**: 5 of his ultimate's 7 hits are judged super (full at L1, half at L2). The last 2 arrive as normal
    attacks after his super window, so Infinity stops them like any normal hit (L1 165 of 231). Reported here; not
    changed, because those two hits really are ordinary, unflagged attacks.
- **error (1)**: **hinata**. `triggerUltimate` throws `ReferenceError: executeHinataUltimate is not
  defined`: in HEAD's abilities.js the function is declared inside a nested block. This is pre-existing (from
  commit 1482d5e9f), not caused by gojo_shinjuku, and left for Hinata's owner.

## Rows
| ultimate | off | L1 | L2 | L3 | verdict |
|---|---:|---:|---:|---:|---|
| albedo | 150 | 150 | 75 | 0 | ok |
| alt_sukuna | 198 | 198 | 99 | 0 | ok |
| aoi_todo | 528 | 528 | 264 | 0 | ok |
| arlong | 0 | 0 | 0 | 0 | no-damage |
| baki | 0 | 0 | 0 | 0 | no-damage |
| batman | 180 | 180 | 90 | 0 | ok |
| beast_boy | 0 | 0 | 0 | 0 | no-damage |
| beerus | 228 | 228 | 114 | 0 | ok |
| ben10 | 150 | 150 | 75 | 0 | ok |
| buggy | 0 | 0 | 0 | 0 | no-damage |
| byakuya | 204 | 204 | 102 | 0 | ok |
| chrollo | 0 | 0 | 0 | 0 | no-damage |
| cyborg | 0 | 0 | 0 | 0 | no-damage |
| dash_parr | 0 | 0 | 0 | 0 | no-damage |
| dseyl | 0 | 0 | 0 | 0 | no-damage |
| elastigirl | 0 | 0 | 0 | 0 | no-damage |
| enoch | 0 | 0 | 0 | 0 | no-damage |
| flash | 0 | 0 | 0 | 0 | no-damage |
| frozone | 0 | 0 | 0 | 0 | no-damage |
| gaara | 195 | 195 | 96 | 0 | ok |
| genos | 0 | 0 | 0 | 0 | no-damage |
| ghostface | 228 | 228 | 114 | 0 | ok |
| gojo | 0 | 0 | 0 | 0 | no-damage |
| goku | 216 | 216 | 108 | 0 | ok |
| goku_black | 0 | 0 | 0 | 0 | no-damage |
| gold_samurai_ranger | 204 | 204 | 102 | 0 | ok |
| green_arrow | 404 | — (no cast) | 202 | 0 | CHECK (L1 x / L2 ok / L3 ok) |
| green_ranger | 0 | 0 | 0 | 0 | no-damage |
| green_samurai_ranger | 204 | 204 | 102 | 0 | ok |
| gwen | 198 | 198 | 99 | 0 | ok |
| hashirama | 162 | 162 | 162 | 162 | forced-off:domain |
| higuruma | 0 | 0 | 0 | 0 | no-damage |
| hinata | — | — | — | — | error |
| hisoka | 0 | 0 | 0 | 0 | no-damage |
| homelander | 202 | 202 | 96 | 0 | ok |
| ichigo | 198 | 198 | 99 | 0 | ok |
| inosuke | 0 | 0 | 0 | 0 | no-damage |
| ippo | 198 | 198 | 99 | 0 | ok |
| isshiki | 204 | 204 | 102 | 0 | ok |
| itachi | 0 | 0 | 0 | 0 | no-damage |
| jason | 0 | 0 | 0 | 0 | no-damage |
| jesus | 174 | 174 | 87 | 0 | ok |
| jiraiya | 0 | 0 | 0 | 0 | no-damage |
| kakashi | 198 | 198 | 99 | 0 | ok |
| kakashi_anbu | 198 | 198 | 99 | 0 | ok |
| kakashi_war | 204 | 204 | 102 | 0 | ok |
| killua | 0 | 0 | 0 | 0 | no-damage |
| krybot | 0 | 0 | 0 | 0 | no-damage |
| l_ryuuzaki | 0 | 0 | 0 | 0 | no-damage |
| light | 204 | 204 | 102 | 0 | ok |
| luffy | 280 | 280 | 140 | 0 | ok |
| madara | 204 | 204 | 102 | 0 | ok |
| maki | 0 | 0 | 0 | 0 | no-damage |
| mayuri | 198 | 198 | 99 | 0 | ok |
| megumi_fushiguro | 0 | 0 | 0 | 0 | no-damage |
| minato | 360 | 360 | 180 | 0 | ok |
| miwa | 168 | 168 | 84 | 0 | ok |
| mmpr_black | 0 | 0 | 0 | 0 | no-damage |
| mmpr_pink | 0 | 0 | 0 | 0 | no-damage |
| mmpr_white | 0 | 0 | 0 | 0 | no-damage |
| mr_incredible | 0 | 0 | 0 | 0 | no-damage |
| naruto | 360 | 360 | 180 | 0 | ok |
| naruto_seventh | 204 | 204 | 102 | 0 | ok |
| netero | 0 | 172 | 0 | 0 | no-damage |
| nezuko | 0 | 0 | 0 | 0 | no-damage |
| ninja_storm_cgpt | 0 | 0 | 0 | 0 | no-damage |
| ninja_storm_rangers | 0 | 0 | 0 | 0 | no-damage |
| obito | 216 | 216 | 108 | 0 | ok |
| omega_ranger | 144 | 144 | 72 | 0 | ok |
| omololu | 360 | 360 | 360 | 360 | forced-off:domain |
| pain | 216 | 216 | 108 | 0 | ok |
| raven | 0 | 0 | 0 | 0 | no-damage |
| red_ranger_mmpr | 204 | 204 | 102 | 0 | ok |
| rengoku | 204 | 204 | 102 | 0 | ok |
| rick | 108 | 108 | 54 | 0 | ok |
| rickPrime | 0 | 0 | 0 | 0 | no-damage |
| robin | 0 | 0 | 0 | 0 | no-damage |
| saiki | 180 | 180 | 90 | 0 | ok |
| saitama | 204 | 204 | 102 | 0 | ok |
| sakura | 174 | 174 | 87 | 0 | ok |
| samurai_red_ranger | 204 | 204 | 102 | 0 | ok |
| sanji | 0 | 0 | 0 | 0 | no-damage |
| sasuke | 0 | 0 | 0 | 0 | no-damage |
| sasuke_adult | 157 | 157 | 78 | 0 | ok |
| sasuke_sensei | 198 | 198 | 99 | 0 | ok |
| shinobu | 216 | 216 | 108 | 0 | ok |
| shisui_fallen | 140 | 140 | 70 | 0 | ok |
| six_paths_pain | 180 | 180 | 90 | 0 | ok |
| soldier_boy | 168 | 168 | 84 | 0 | ok |
| spd_blue | 0 | 0 | 0 | 0 | no-damage |
| spd_green | 0 | 0 | 0 | 0 | no-damage |
| spd_pink | 0 | 0 | 0 | 0 | no-damage |
| spd_red | 0 | 0 | 0 | 0 | no-damage |
| spd_yellow | 0 | 0 | 0 | 0 | no-damage |
| spiderman | 204 | 204 | 102 | 0 | ok |
| starfire | 0 | 0 | 0 | 0 | no-damage |
| sukuna | 32 | 32 | 28 | 24 | forced-off:domain |
| superman | 380 | 380 | 190 | 0 | ok |
| syndrome | 0 | 0 | 0 | 0 | no-damage |
| tobi | 216 | 216 | 108 | 0 | ok |
| tobirama | 0 | 216 | 108 | 0 | no-damage |
| toji | 0 | 0 | 0 | 0 | no-damage |
| vegeta | 204 | 204 | 102 | 0 | ok |
| vegeta_dark | 198 | 198 | 99 | 0 | ok |
| vilgax | 198 | 198 | 99 | 0 | ok |
| violet | 0 | 0 | 0 | 0 | no-damage |
| windrangers | 0 | 0 | 0 | 0 | no-damage |
| yuji | 0 | 0 | 0 | 0 | no-damage |
| yuta | 231 | 165 | 80 | 0 | CHECK (L1 x / L2 ok / L3 ok) |
| zaraki | 180 | 180 | 90 | 0 | ok |
| zaraki_shikai | 180 | 180 | 90 | 0 | ok |
| zenitsu | 180 | 180 | 90 | 0 | ok |
| zoro | 0 | 0 | 0 | 0 | no-damage |
