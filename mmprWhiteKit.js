// White Ranger (mmpr_white) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from
// mmprWhiteData.js (the Ranger roster-parity lever x1.7 applies in play). Measured routes: docs/mmpr_white/COMBOS_BALANCE.md.
export const MMPR_WHITE_KIT = { type: 'Saba Duelist / Formation Leader', energy: 'Morph Energy', difficulty: 'Hard',
  summary: 'Tommy Oliver: precise strikes, the sabre Saba, and short scripted Ninja Megazord orders. You always control Tommy; the Megazord performs one committed action per order and leaves. Two Command pips (each refills over 180 f, one at a time), 60 f between orders, one order at a time. The Ninja Megazord is the team\'s Zord; the order system is a game adaptation.',
  passive: { name: 'Three Disciplines → Formation', input: 'Automatic', effect: 'A clean, unblocked grounded HAND (Light chain), FOOT (Low / Rising Tiger / knock-away / grounded Tiger Ascent) and BLADE (Saba) hit — in any order, within 180 f of the first — earns ONE Formation token (lasts 240 f). Repeats never refresh the timer; a damaging hit breaks an incomplete set (a held token survives). The token is spent only when you retap Special within 10 f of an order\'s clean hit (+10 Energy) to add that order\'s follow-up — once per combo.' },
  basics: [
    { name: 'Open Palm → Body Check → Tiger Heel', input: 'Light, fresh Light, fresh Light', desc: '5/7/10 f startup; raw 18/22/30. HAND. Clean-hit retaps only.' },
    { name: 'Saba Cut', input: 'Heavy', desc: '14 f; raw 56 Saba strike. BLADE.' },
    { name: 'Low Heel', input: 'Down + Light / Down + Heavy', desc: '8 f; raw 25; hits low. FOOT.' },
    { name: 'Rising Tiger', input: 'Up + Heavy / Up-Attack', desc: '12 f; raw 44 launcher. FOOT. Jump manually to follow up.' },
    { name: 'Turning Heel', input: 'Air Light / Air Heavy', desc: '8 f; raw 32.' },
    { name: 'Command chain', input: 'Forward + Heavy → fresh Heavy → fresh Heavy', desc: 'Advancing strike 24 → Saba cut 32 (BLADE) → knock-away kick 44 (FOOT). Confirmed Up+Heavy on the last step = Rising Tiger.' },
    { name: 'Double-tap blink', input: 'Double-tap Left / Right', desc: 'Shared rangers.js blink: 2 charges (90 f refill each), 3 f wind-up, 5 f invulnerable travel, 3 f recovery, 230 px, stops in front of the foe, ground only.' }],
  specials: [
    { name: "Saba's Answer", input: 'Neutral Special', cost: 15, desc: '13 f; raw 46 mid-range Saba cut (~142 px from Tommy\'s centre). BLADE. Feint: press Block during startup frames 1-9 → 12 f recovery, no hitbox, Energy stays spent.' },
    { name: 'White Tiger Ascent', input: 'Down Special', cost: 18, desc: '10 f; raw 42 rising kick. FOOT (started grounded). Once per airtime; 16 f landing; no invulnerability.' },
    { name: 'Tiger Descent', input: 'Air Down Special', cost: 15, desc: '12 f; raw 44 capped descending kick; once per airtime; 24 f landing recovery. No discipline.' },
    { name: 'Twin Fist', input: 'Forward Special', cost: 15, desc: '+1 pip. 12 f order, the Megazord steps in: one raw 38 straight punch. Formation follow-up: a second punch, raw 24.' },
    { name: 'Crane Rise', input: 'Up Special', cost: 18, desc: '+1 pip. Raised-leg kick, raw 44, launches (once per combo, shared juggle rules). Formation follow-up: a pop-up push kick, raw 20 (not a re-launch); on hit, jump-cancel Tommy\'s signal pose to chase in the air. Up+Special never jumps.' },
    { name: 'Ninja Edge', input: 'Back Special', cost: 20, desc: '+1 pip. Slow visible sword draw, then a descending slash, raw 54. Formation follow-up: the supplied finishing arc, raw 26.' },
    { name: "Leader's Return", input: 'Double-tap Left / Right (12 f after a Formation follow-up hits)', cost: 0, desc: 'Only from the late recovery of Tommy\'s Formation signal pose: one normal paid blink (uses a charge). No invulnerability beyond the blink\'s own, no refund, once per combo.' }],
  ultimate: { name: 'White Light — Ninja Grand Formation', input: 'Ultimate', cost: 100, desc: '30 f Saba strike (raw 35). Clean hit: Megazord punch 40 → Tommy air kick 35 → Megazord raised-leg 40 → Tommy lands Saba-ready → Megazord sword + Tommy final 130 (280 raw total before shared scaling). Miss/block: 60 f recovery. A held Formation token is consumed and only changes the presentation rhythm (hand → foot → blade). Orders are locked 120 f afterwards.' },
  combos: [
    { name: 'Light string', sequence: 'Light → Light → Light', desc: 'True combo, 68 dmg. No resources. One HAND credit.' },
    { name: 'Low into Saba', sequence: 'Down+Light → Heavy → Saba\'s Answer', desc: 'True combo, 125 dmg. 15 Energy. FOOT + BLADE in one combo.' },
    { name: 'Command chain', sequence: 'Forward+Heavy → Heavy → Heavy', desc: 'True combo, 90 dmg. BLADE (Saba) + FOOT (knock-away).' },
    { name: 'Launcher pursuit', sequence: 'Up+Heavy → jump → Air Turning Heel', desc: 'True combo, 72 dmg.' },
    { name: 'Earn a Formation', sequence: 'any clean HAND, FOOT and BLADE hits within 180 f', desc: 'Measured across three separate neutral exchanges (131 f HAND→BLADE) and in any order. Not a combo: a damaging hit on Tommy breaks an incomplete set.' },
    { name: 'Formation Twin Fist + Leader\'s Return', sequence: 'Forward Special → (fist hits) Special retap → (follow-up hits) double-tap → Heavy', desc: 'True combo, 115 dmg. 15 + 10 Energy, 1 pip, the token and one blink charge.' },
    { name: 'Formation Crane Rise air conversion', sequence: 'Up Special → (kick launches) Special retap → (push kick pops) jump → Air Light', desc: 'True combo, 94 dmg. The follow-up makes Tommy\'s signal pose jump-cancellable. 18 + 10 Energy, 1 pip.' },
    { name: 'Ninja Edge pressure', sequence: 'Back Special → walk in under the slow draw', desc: 'Pressure, not a combo: the slash is blocked while Tommy closes the distance. 20 Energy, 1 pip.' },
    { name: 'Saba confirm ultimate', sequence: 'Heavy → Ultimate (recovery cancel)', desc: 'True combo into White Light, 299 dmg. 100 Energy.' }] }
