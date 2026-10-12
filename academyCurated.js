// academyCurated.js — CHARACTER ACADEMY curated, HAND-TUNED multi-step lessons (additive, isolated — no kit edits)
// for the complex systems auto-lessons can't explain well. Each curated lesson is a short SEQUENCE of drills; the
// Academy runs them in order (SHOW ME plays each step; TRY IT advances to the next on success). A step reuses the
// same shape as an auto-lesson plus a `tags` array consumed by the scenario system. Shown first, under "Guided
// Lessons". Only fighters that EXIST on main are listed. This file is pure data.
//
// step = { name, input, cat, tags?, desc }
export const ACADEMY_CURATED = {
  // ── NARUTO-UNIVERSE clone kit: summon-then-select ──
  naruto: [
    { name: "Shadow-Clone Combo (summon → select)", desc: "Naruto's clones are a two-step move: SUMMON a formation, then SELECT which combo it runs.",
      steps: [
        { name: "Summon the clone formation", input: "Down, Down, Up + Special", cat: "special", desc: "The ↓↓↑ motion + Special stages a ring of shadow clones around you." },
        { name: "Fire the Two-Thousand Combo", input: "Ultimate", cat: "ultimate", tags: ["combo_followup"], desc: "With the formation staged, Ultimate unleashes the Uzumaki swarm." },
      ] },
  ],
  naruto_seventh: [
    { name: "Kurama Bond Ladder", desc: "Hold Charge to climb the Bond ladder — each tier unlocks a stronger form and ult.",
      steps: [
        { name: "Charge Bond → Red Cloak", input: "Hold Charge", cat: "special", tags: ["full_chakra"], desc: "Holding Charge steps you up: Base → Red one-tail cloak → Four-Tails → KCM." },
        { name: "Bijuudama (neutral Ultimate)", input: "Ultimate", cat: "ultimate", tags: ["full_chakra"], desc: "In a cloak, neutral Ultimate fires a Tailed-Beast Ball." },
        { name: "Rikudou finish (Down + Ultimate)", input: "Down + Ultimate", cat: "ultimate", tags: ["full_chakra"], desc: "At full Bond, Down+Ult is the Six-Paths Rikudou burst — his strongest." },
      ] },
    { name: "Nine-Tails Avatar", desc: "At full Bond, summon the giant Kurama avatar behind you.",
      steps: [ { name: "Summon the Avatar", input: "Up + Ultimate", cat: "ultimate", tags: ["full_chakra"], desc: "Up+Ult at full Bond looms Kurama behind you for a timed buff." } ] },
  ],
  // ── GAARA: sand → coffin → burial, and the Shukaku channel risk ──
  gaara: [
    { name: "Sand Coffin → Sabaku Taisou", desc: "Trap the foe in sand, then collapse it in the Giant Sand Burial ultimate.",
      steps: [
        { name: "Sand Bullet (zoning)", input: "Down + Special", cat: "special", desc: "A sand projectile to control space from range." },
        { name: "Sabaku Taisou (Ultimate)", input: "Ultimate", cat: "ultimate", tags: ["full_chakra"], desc: "The Giant Sand Burial — a guaranteed cinematic crush." },
      ] },
    { name: "Shukaku Summon (channel risk)", desc: "Summon the One-Tail — but CHANNELLING leaves you exposed; time it safely.",
      steps: [
        { name: "Summon Shukaku", input: "Down + Ultimate", cat: "ultimate", tags: ["set_meter:gauge=100", "full_chakra"], desc: "With a full One-Tail gauge, Down+Ult channels Shukaku in behind you." },
        { name: "Tailed-Beast Ball", input: "Special", cat: "special", tags: ["summon_active"], desc: "While Shukaku is out, Special fires its Tailed-Beast Ball." },
      ] },
  ],
  // ── MADARA: Susano'o ladder, Avatar, Kurama control break ──
  madara: [
    { name: "Susano'o Ladder", desc: "Charge to RELEASE climbs the Susano'o stages; each stage adds reach and damage.",
      steps: [
        { name: "Climb a Susano'o stage", input: "Hold Charge (at full Chakra)", cat: "special", tags: ["full_chakra"], desc: "Charge to full and release to climb Base → S1 → S2 → S3." },
        { name: "Susano'o sword swing", input: "Heavy", cat: "heavy", tags: ["mode_active:susanoo"], desc: "In a Susano'o stage, Heavy is the giant blade swing." },
      ] },
    { name: "Susano'o Avatar", desc: "At full Chakra, Up+Ult becomes the timed giant Avatar boss.",
      steps: [ { name: "Enter the Avatar", input: "Up + Ultimate", cat: "ultimate", tags: ["full_chakra"], desc: "A giant Susano'o avatar with its own HP and ×2 damage for ~11s." } ] },
    { name: "Kurama — summon & control break", desc: "Summon Kurama; its control BREAKS after a few clean hits, so don't waste it.",
      steps: [
        { name: "Summon Kurama (Down + Ult)", input: "Down + Ultimate", cat: "ultimate", tags: ["full_chakra"], desc: "The Nine-Tails looms behind you." },
        { name: "Bijuudama", input: "Special", cat: "special", tags: ["summon_active"], desc: "While Kurama is out, Special fires a Bijuudama — but control breaks after 4 clean hits." },
      ] },
  ],
  // ── SHISUI (TRINITY): Mangekyou Signal, Variant Swap, corner failure ──
  shisui_trinity: [
    { name: "Mangekyou Signal → Variant Swap", desc: "Signal a partner in, then commit to them. The partner call FAILS in the corner — watch your spacing.",
      steps: [
        { name: "Mangekyou Signal (Down + Heavy)", input: "Down + Heavy", cat: "heavy", desc: "A partner body-flickers in behind the foe for one strike." },
        { name: "Corner rule: Signal fails in the corner", input: "Down + Heavy", cat: "heavy", tags: ["player_corner"], desc: "With no room behind the foe, nothing comes — you're left vulnerable." },
        { name: "Variant Swap (Grab)", input: "Grab", cat: "grab", desc: "While the partner is on screen, Grab commits to them as your active fighter." },
      ] },
  ],
  // ── SHISUI (FALLEN): flicker charges, afterimages, Kotoamatsukami orders ──
  shisui_fallen: [
    { name: "Body Flicker & Afterimages", desc: "His dash is a Flicker Step that leaves a hit-absorbing afterimage; charges regenerate.",
      steps: [
        { name: "Flicker Step (dash through)", input: "Forward + Special", cat: "mobility", desc: "Flicker THROUGH the foe to the far side, cutting them on the way past." },
        { name: "Afterimage Feint (vs an attack)", input: "Back + Special", cat: "special", tags: ["incoming_melee"], desc: "Leave a decoy that eats the dummy's hit while you slip out." },
      ] },
    { name: "Emerald Susanoo Ladder", desc: "Down+Ult enters the Susanoo; press it again to CLIMB to the Complete Avatar.",
      steps: [
        { name: "Enter the Emerald Susanoo", input: "Down + Ultimate", cat: "ultimate", tags: ["full_chakra"], desc: "A giant emerald Susanoo whose shell absorbs your damage." },
        { name: "Climb to Tier 2", input: "Down + Ultimate", cat: "ultimate", tags: ["mode_active:susanoo"], desc: "Re-press at full chakra to reform into the larger armored avatar." },
      ] },
    { name: "Kotoamatsukami (mind-control order)", desc: "His signature genjutsu — far stronger against a fellow Uchiha.",
      steps: [ { name: "Cast on an Uchiha in Susanoo", input: "Up + Ultimate", cat: "ultimate", tags: ["opponent:itachi", "opponent_mode:susanoo"], desc: "Mirrors the foe's L/R and locks their specials; the Curse-Breaker easter egg runs longer vs an Uchiha." } ] },
  ],
  // ── KAKASHI (KAMUI): Sharingan, Kamui, Obito's Gift, Frog Henge, Kawarimi ──
  kakashi_war: [
    { name: "Sharingan & Kamui", desc: "Light the eye, then warp with Kamui.",
      steps: [
        { name: "Light the Sharingan (Charge-tap)", input: "Charge-tap", cat: "special", desc: "A standing Charge-tap toggles the red eye (drains Chakra)." },
        { name: "Kamui warp (Forward + Special)", input: "Forward + Special", cat: "special", desc: "A space-time swirl that repositions through the foe." },
      ] },
    { name: "Kawarimi — the defensive read", desc: "Substitute out of an incoming attack.",
      steps: [ { name: "Kawarimi (Back + Special) vs an attack", input: "Back + Special", cat: "special", tags: ["incoming_melee"], desc: "When the dummy swings, Back+Special substitutes you to safety." } ] },
    { name: "Frog Henge", desc: "The gag transform — a tiny, low hurtbox that ducks highs.",
      steps: [ { name: "Frog Henge (Crouch + Charge-tap)", input: "Crouch + Charge-tap", cat: "special", desc: "Smoke → frog: a small hurtbox that can't attack; any button pops you out." } ] },
  ],
  kakashi_anbu: [
    { name: "Sharingan & Raikiri", desc: "Light the eye to make the Raikiri track.",
      steps: [
        { name: "Light the Sharingan (Charge-tap)", input: "Charge-tap", cat: "special", desc: "Toggles the eye; with it lit, the Raikiri dash HOMES." },
        { name: "Raikiri (neutral Special)", input: "Special", cat: "special", desc: "Charge-hold the lightning blade, release to dash-strike." },
      ] },
  ],
  // ── SASUKE (SENSEI): eye sets, Susanoo tiers, Arm Grab ──
  sasuke_sensei: [
    { name: "Eye-Set Cycle", desc: "Up+Ult cycles his dōjutsu sets (Raiton ↔ Mangekyou ↔ Rinnegan); each set rewires his specials.",
      steps: [
        { name: "Cycle the eye set", input: "Up + Ultimate", cat: "ultimate", desc: "Swap between Raiton / Mangekyou / Rinnegan — watch the SET indicator." },
        { name: "Set-specific Special", input: "Special", cat: "special", desc: "The same Special button fires a different jutsu per eye set." },
      ] },
    { name: "War-Susano'o Arm Grab", desc: "The cheapest Susano'o tool — a ribcage claw command grab.",
      steps: [ { name: "Arm Grab (Forward + Grab)", input: "Forward + Grab", cat: "grab", desc: "A spectral arm pops out, clutches, and slams." } ] },
  ],
  // ── Lighter curated lessons for the remaining named fighters ──
  hinata: [
    { name: "Gentle Fist → Twin Lion Fists", desc: "Byakugan pressure into the ultimate.",
      steps: [
        { name: "Byakugan (Down + Special)", input: "Down + Special", cat: "special", desc: "A buff that sharpens her Gentle-Fist reads." },
        { name: "Juuhou Soshiken (Ultimate)", input: "Ultimate", cat: "ultimate", tags: ["full_chakra"], desc: "The Twin Lion Fists — a guaranteed Gentle-Fist barrage." },
      ] },
  ],
  sakura: [
    { name: "Byakugou → Cherry-Blossom Impact", desc: "Bank the seal, then detonate.",
      steps: [
        { name: "Byakugou Seal (Back + Special)", input: "Back + Special", cat: "special", desc: "A self-heal / power bank." },
        { name: "Daichi no Sakebi (Ultimate)", input: "Ultimate", cat: "ultimate", tags: ["full_chakra"], desc: "Screen-wide cherry-petal AOE." },
      ] },
  ],
  jiraiya: [
    { name: "Sage Mode → Frog Song", desc: "Enter Hermit (Sage) mode, then use its upgraded kit.",
      steps: [
        { name: "Rasengan (Special)", input: "Special", cat: "special", desc: "The core spiralling-chakra palm." },
        { name: "Hermit Ultimate", input: "Ultimate", cat: "ultimate", tags: ["full_chakra"], desc: "Sage-mode toad ultimate." },
      ] },
  ],
  omololu: [
    { name: "Kamui Blink → Domain", desc: "Blink in, then express the directional ultimates.",
      steps: [
        { name: "Kamui Warp (Back + Special)", input: "Back + Special", cat: "special", desc: "An Obito-lineage space-time blink." },
        { name: "Domain (neutral Ultimate)", input: "Ultimate", cat: "ultimate", tags: ["full_chakra"], desc: "His signature domain — Down+Ult transforms, Up+Ult is the Drone Swarm." },
      ] },
  ],
  rickPrime: [
    { name: "Portal Pressure → Temporal Rewind", desc: "Zone with portals, then rewind time.",
      steps: [
        { name: "Portal Blast (Special)", input: "Special", cat: "special", desc: "A portal-routed projectile." },
        { name: "Temporal Rewind (Ultimate)", input: "Ultimate", cat: "ultimate", tags: ["full_chakra"], desc: "Rewinds his own state — his signature escape/punish." },
      ] },
  ],
  jesus: [
    { name: "Holy Kit tour", desc: "The core of his divine toolkit.",
      steps: [
        { name: "Holy Fire (Forward + Special)", input: "Forward + Special", cat: "special", desc: "A holy-fire projectile." },
        { name: "Blessed Energy (Ultimate)", input: "Ultimate", cat: "ultimate", tags: ["full_chakra"], desc: "His procedural divine ultimate." },
      ] },
  ],
}

export function curatedFor(rosterKey) { return ACADEMY_CURATED[rosterKey] || [] }
export function curatedFighters() { return Object.keys(ACADEMY_CURATED) }
