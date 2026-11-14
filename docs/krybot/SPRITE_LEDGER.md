# Krybot sprite ledger

Source: `Plug & Play - Power Rangers S.P.D._ Escape of the Five Fugitives - Enemies and Bosses - Krybot.png`

SHA-256: `f6f58db89dd5c19f62839ab89038c8ec1e8c21052c0468309c576cb609c78c14`. Verified 655×680, RGB without alpha. Original bytes retained in the project root. Outer background RGB(89,115,123); cell background RGB(148,192,204).

Coordinates below are verified cells, not connected-component sprite guesses. Idle cells extend through row 63: the suggested 52px height clips boots/contact pixels, so both use 56px. All remaining proposed cell bounds were visually inspected in source_enlarged.png and contact_sheet.png, including detached explosion particles and tumble pieces.

Each background region has a seed, exact color and pixel count in source_rects.json. Exact light-cell and marginal outer-background components are removed **inside each verified cell only**, including enclosed negative space between limbs. Robot greys, sensor red, shading, black outlines and baked black foot-contact marks remain untouched. No global palette deletion, interpolation, new limb art or per-component body splitting. All non-background pixels are checked against their source RGB bytes in asset_integrity.json. No palette collisions with the removed blue backgrounds were identified visually; the dark contact lines are ambiguous shadows/outline, so they are retained.

Body strips use a common 112×88 canvas with pivot (56,80); source anchors below are cell-local authored body/foot pivots. Tumbles are airborne compact pivots. Pixels are pasted at that pivot, not recentered by each alpha bbox. Effects use their own center anchors. Normal render scale is 2.2 including the engine's 1.18 global factor.

| Cell | Source x,y,w,h | Anchor | Opaque pixels | Interpretation |
|---|---|---|---:|---|
| idle0 | 8,8,32,56 | 16,56 | 732 | Two idle/ready variations |
| idle1 | 48,8,32,56 | 16,56 | 713 | Two idle/ready variations |
| run0 | 8,72,48,56 | 24,56 | 603 | Locomotion; preserved contact shadow |
| run1 | 64,72,48,56 | 24,56 | 660 | Locomotion; preserved contact shadow |
| run2 | 120,72,48,56 | 24,56 | 527 | Locomotion; preserved contact shadow |
| run3 | 176,72,48,56 | 24,56 | 579 | Locomotion; preserved contact shadow |
| run4 | 232,72,48,56 | 24,56 | 680 | Locomotion; preserved contact shadow |
| run5 | 288,72,48,56 | 24,56 | 677 | Locomotion; preserved contact shadow |
| run6 | 344,72,48,56 | 24,56 | 559 | Locomotion; preserved contact shadow |
| run7 | 400,72,48,56 | 24,56 | 596 | Locomotion; preserved contact shadow |
| tumble0 | 8,136,32,32 | 16,32 | 410 | Compact airborne rotation, not a disconnected body part |
| tumble1 | 52,136,32,32 | 16,32 | 410 | Compact airborne rotation, not a disconnected body part |
| tumble2 | 92,136,32,32 | 16,32 | 410 | Compact airborne rotation, not a disconnected body part |
| tumble3 | 140,136,32,32 | 16,32 | 410 | Compact airborne rotation, not a disconnected body part |
| jump | 8,176,40,64 | 16,64 | 611 | Raised-arm leap; also authored upward intercept |
| punchWind | 8,248,56,57 | 22,57 | 624 | Forward punch preparation |
| punch | 72,248,56,57 | 22,57 | 618 | Extended punch |
| kickWind | 8,312,49,56 | 22,56 | 714 | Raised knee / kick preparation |
| kick | 64,312,49,56 | 22,56 | 714 | Extended horizontal boot |
| ready | 8,376,48,57 | 22,57 | 688 | Arm preparation |
| aim | 64,376,48,57 | 22,57 | 658 | Forearm horizontal aim; muzzle at local (47,21.5) |
| lowerArm | 120,376,48,57 | 22,57 | 626 | Arm lowering/recovery |
| guard | 8,440,40,48 | 20,48 | 605 | Compact defensive stance; crouch substitute |
| recoil | 8,496,32,48 | 16,48 | 524 | Bent damage/recoil pose |
| fall0 | 8,552,56,48 | 28,48 | 640 | Fall / grounded phase; not a native get-up sequence |
| fall1 | 72,552,56,48 | 28,48 | 559 | Fall / grounded phase; not a native get-up sequence |
| fall2 | 136,552,56,48 | 28,48 | 539 | Fall / grounded phase; not a native get-up sequence |
| fall3 | 200,552,56,48 | 28,48 | 537 | Fall / grounded phase; not a native get-up sequence |
| fx0 | 8,608,64,64 | 32,32 | 52 | Energy/explosion effect; separate from body |
| fx1 | 80,608,64,64 | 32,32 | 451 | Energy/explosion effect; separate from body |
| fx2 | 152,608,64,64 | 32,32 | 1440 | Energy/explosion effect; separate from body |
| fx3 | 224,608,64,64 | 32,32 | 2514 | Energy/explosion effect; separate from body |
| fx4 | 296,608,64,64 | 32,32 | 587 | Energy/explosion effect; separate from body |

Raw cells live in assets/krybot/cells/, body animation strips in assets/krybot/, the tight 8×8 projectile is shot.png, and explosion.png is the separate five-cell 64×64 effect strip. The portrait is a nearest-neighbor crop from idle body art. All nearest-neighbor enlargement is presentation only.

The top-right panel is excluded from all body/effect extraction. Exact visible credit transcription: **ripped by / The FRANKETE / FOR TSR**. WANTED is a panel heading, not an action label. credit_panel.png preserves the enlarged evidence. The source listing names uploader Franketepoke2; credits.js registers both the visible ripper name and uploader.

The source has no action labels proving game semantics. Jab/low/launcher/aerial/command timing, the reversal of fall poses into a get-up transition and squad coordination are authored adaptations. No native multi-frame ankle kick, uppercut or complete rise animation is claimed.
