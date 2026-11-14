// Black Ranger (mmpr_black) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from
// mmprBlackData.js (the Ranger roster-parity lever x1.7 applies in play). Measured routes: docs/mmpr_black/COMBOS_BALANCE.md.
export const MMPR_BLACK_KIT = { type: 'Martial Artist / Aerial Assist Commander', energy: 'Morph Energy', difficulty: 'Medium-Hard',
  summary: 'Adam Park: disciplined kicks and palm strikes that set up short scripted Falconzord passes. You always control Black; the Falconzord makes one committed pass per call and leaves. Two Sortie pips (each refills over 180 f, one at a time), 60 f between calls, one sortie at a time. The Falconzord partnership is a game adaptation.',
  passive: { name: 'Pincer Confirm', input: 'Automatic', effect: 'Once per combo, a clean grounded Heavy / command finisher tags the target for 45 f. If a Falconzord hit lands on that target while Black is still in that same attack, ONE fresh Light/Heavy retap may cancel the last 6 f of its recovery. No damage bonus, no extra stun, no pip refund; blocked/parried/armored contacts never tag.' },
  basics: [
    { name: 'Palm Check → Turning Strike → Driving Heel', input: 'Light, fresh Light, fresh Light', desc: '5/7/10 f startup; raw 18/22/30. Clean-hit retaps only.' },
    { name: 'Crescent Heel', input: 'Heavy', desc: '14 f; raw 56 crescent kick (supplied trail). Pincer tag on a clean grounded hit.' },
    { name: 'Ankle Sweep', input: 'Down + Light / Down + Heavy', desc: '8 f; raw 26; hits low.' },
    { name: 'Ascending Heel', input: 'Up + Heavy / Up-Attack', desc: '12 f; raw 44 launcher. Jump manually to follow up (shared launcher rules).' },
    { name: 'Flying Side Kick', input: 'Air Light / Air Heavy', desc: '8 f; raw 32.' },
    { name: 'Command chain', input: 'Forward + Heavy → fresh Heavy → fresh Heavy', desc: 'Advancing palm 24 → turning kick 32 → knock-away 44. Confirmed Up+Heavy on the last step = Ascending Heel.' },
    { name: 'Double-tap blink', input: 'Double-tap Left / Right', desc: 'Shared rangers.js blink: 2 charges (90 f refill each), 3 f wind-up, 5 f invulnerable travel, 3 f recovery, 230 px, stops in front of the foe, ground only. No energy.' }],
  specials: [
    { name: 'Crescent Break', input: 'Neutral Special', cost: 15, desc: '13 f; two authored contacts raw 24 (f13-14) + 30 (f22-24). Unsafe on block. Works with empty pips.' },
    { name: 'Rising Mastodon', input: 'Down Special', cost: 18, desc: '10 f; raw 44 committed rising kick. Once per airtime; 16 f landing recovery; no invulnerability.' },
    { name: 'Falcon Sweep', input: 'Forward Special', cost: 12, desc: '+1 pip. 12 f call, then a telegraphed horizontal lane pass: one raw 38 mid hit, low knockback, short hitstun.' },
    { name: 'Talon Lift', input: 'Up Special', cost: 18, desc: '+1 pip. Dives at the target region captured at the call, then rises through it: raw 18 + 30; the second contact launches (one assist launcher per combo). Up+Special never jumps.' },
    { name: 'Covering Volley', input: 'Back Special', cost: 15, desc: '+1 pip. Falconzord enters behind Black and fires two spaced raw 20 energy shots at the captured target region (ordinary projectiles).' }],
  ultimate: { name: 'Falcon Formation: Blackout Descent', input: 'Ultimate', cost: 100, desc: '30 f advancing strike (raw 35). Clean hit: Falcon sweep 40 → rising kick 45 → talon pass 40 → bright dive 100 (260 raw total before shared scaling). Miss/block: 60 f recovery. Retires any live sortie; sortie calls are locked 120 f afterwards.' },
  // Measured in harness/mmpr_black.test.mjs (true combo = every later hit landed inside hitstun). Damage at full health, default spacing.
  combos: [
    { name: 'Light string', sequence: 'Light → Light → Light', desc: 'True combo, 68 dmg. No resources.' },
    { name: 'Crescent confirm', sequence: 'Light → Heavy → Crescent Break', desc: 'True combo, 122 dmg (both Crescent contacts). 15 Energy, no pips.' },
    { name: 'Command chain', sequence: 'Forward+Heavy → Heavy → Heavy', desc: 'True combo, 90 dmg. Ends with the knock-away (Pincer tagger).' },
    { name: 'Launcher pursuit', sequence: 'Up+Heavy → jump (cancel) → Air kick', desc: 'True combo, 72 dmg.' },
    { name: 'Pincer', sequence: 'Falcon Sweep call → Heavy (call recovery) → bird hits → Light retap', desc: 'True combo, 107 dmg. The Falcon hit on the tagged target opens the last-6 f Light/Heavy cancel. 1 pip + 12 Energy.' },
    { name: 'Talon conversion', sequence: 'Heavy → Talon Lift → jump → Air kick', desc: 'True combo, 123 dmg. 1 pip + 18 Energy. (Light → Talon Lift drops: a Light is too short.)' },
    { name: 'Blink punish', sequence: 'double-tap blink → Heavy → Falcon Sweep', desc: 'True combo after the blink, 92 dmg.' },
    { name: 'Close confirm ultimate', sequence: 'Light → Heavy → Ultimate', desc: 'True combo into Falcon Formation, 299 dmg. 100 Energy.' },
    { name: 'Volley approach (pressure)', sequence: 'Covering Volley → walk in', desc: 'NOT a combo: both shots are blockable; they cover the approach.' }] }
