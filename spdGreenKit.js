// S.P.D. Green Ranger — Move List / kit metadata (kits.js entry). Numbers = authored data in spdGreenData.js;
// measured advantages and combos are in docs/spd_green/COMBOS.md.
export const SPD_GREEN_KIT={type:'Acrobatic Read / Counterpressure',energy:'Energy',difficulty:'Medium',
 summary:'Bridge Carson: acrobatic kicks, a finite Deltamax shot, and Aura Read — a vulnerable scan that marks the opponent for one confirmed Acrobat Step follow-up. Psychic mechanics while morphed and the phase step are gameplay adaptations.',
 passive:{name:'Aura Read',input:'Charge (fresh press, grounded neutral)',effect:'12f startup, 24f scan, 12f recovery, 240f cooldown. Fully vulnerable; any interruption cancels with no reward. Completing the scan within 350px marks that opponent for 180f (one mark per owner). The mark does no damage, no debuff, reads no inputs and triggers no counter — it only unlocks the Acrobat Step follow-up.'},
 basics:[{name:'Quick Jab → Step Punch → High Kick',input:'Light, fresh Light, fresh Light',desc:'5/6/9f startup; raw 17/20/28. Clean-hit recovery retaps only; holding never chains.'},
  {name:'Turning Side Kick',input:'Heavy',desc:'13f startup; raw 52.'},
  {name:'Sliding Low Kick',input:'Down + Light / Heavy',desc:'8f startup; raw 25; hits low.'},
  {name:'Handstand Launcher',input:'Up + Heavy / Up-Attack',desc:'12f startup; raw 42. Jump manually to follow up (no automatic lift).'},
  {name:'Flying Side Kick',input:'Air Light / Heavy',desc:'8f startup; raw 30.'},
  {name:'Command string',input:'Forward+Heavy → fresh Heavy → fresh Heavy',desc:'Advancing kick 24 → Deltamax check 32 → knock-away 44. Confirmed Up+Heavy on the last step selects the launcher.'}],
 specials:[{name:'Deltamax Check',input:'Neutral Special',cost:12,desc:'15f; raw 36. One finite non-piercing shot per owner.'},
  {name:'Acrobat Step',input:'Forward Special',cost:18,desc:'14f; cartwheel kick raw 20 + handstand kick raw 28. Bounded ~100px advance, stops at bodies. No invulnerability, no cross-through. Against YOUR Aura-marked opponent, a clean step allows one fresh Heavy within 10f for a raw 20 follow-up (+5 Energy, consumes the mark, once per combo).'},
  {name:'Rising Arc',input:'Down Special (ground)',cost:18,desc:'10f; raw 40 rising kick. Once per airtime; 16f landing recovery; no invulnerability.'},
  {name:'Read and Retreat',input:'Back Special (ground neutral)',cost:12,desc:'6f; up to 90px backward, stopped by walls/bodies; 18f recovery. No damage, no invulnerability, no cancel out of hitstun or attacks.'},
  {name:'Heel Return',input:'Air Down Special',cost:15,desc:'12f; raw 44 descending heel. Once per airtime, capped descent, no bounce, 24f landing recovery.'}],
 mobility:{name:'Phase step (shared ground teleport)',input:'Double-tap Left / Right (release between presses)',cost:8,desc:'12-frame tap window; 3f wind-up, 2f transit, 8f recovery; up to 120px, blocked by bodies/terrain/stage edge; 36f cooldown. No invulnerability, no damage, never auto-places behind. Low Energy or cooldown → the normal dash.'},
 ultimate:{name:'Shared Ranger Zord Assault — pending',input:'Ultimate',cost:100,desc:'Not available: the shared opt-in Ranger Zord system does not exist in this project yet. No Energy is spent and there is no fallback ultimate. Prepared: raw 240 target, clean-opener requirement, green call pose; a Falconzord would be labelled a creative crossover assist.'},
 combos:[]}
