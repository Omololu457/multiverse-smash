import { KEVIN_MOVES, KEVIN_RUSH, MATERIALS } from './kevinData.js'

const row=(name,input,desc,cost)=>({name,input,desc,cost})
const h=KEVIN_MOVES.human, u=KEVIN_MOVES.ultimate
export const KEVIN_KIT={
  type:'Mobile Bruiser / Absorption',energy:'Power',difficulty:'Medium',
  summary:'Sample one material at a time, intercept discrete energy shots, or use full Power to become Ultimate Kevin. PS5 uses the shared action bindings. P1 keyboard: J light, K heavy, I launcher, L special, O grab, P charge, U ultimate.',
  passive:{name:'Carried samples',input:'L2 + R1 / P + L (ground)',effect:'Fresh chord cycles Steel, Car alloy, Taydenite, Rubber, Alien armor and Stone. L2 alone charges Power. Coatings last 12 seconds.'},
  basics:[
    row('One-Two-Overhand / Amalgam Claws','□ / J (fresh presses)','Clean-hit chain. Human 48 / 48 / 64, Ultimate 63 / 65 / 82 raw.'),
    row('Heavy / Mutant Heavy','△ / K','95 / 118 raw. Back + Heavy without a shot also uses this move.'),
    row('Forged Reach / Lunging Claw','Forward + △ / K','110 / 133 raw. Taydenite adds guardstun to Forged Reach.'),
    row('Launcher / Mutant Launcher','Up + △ / W + K or I','78 / 96 raw. Jump-cancel after a clean hit.'),
    row('Sweep / Mutant Low','Down + △ / S + K','65 / 84 raw; low knockdown.'),
    row('Air Light / Aerial Claw','Air □ / J','60 / 79 raw. Clean hit can cancel into descending heavy.'),
    row('Demolition Drop / Colossus Drop','Air △ / K','105 / 128 raw; descending spike.'),
    row('Throw / Mutant Throw','L1 / O (ground)','100 / 122 raw; uses standard throw tech. Human Kevin samples approved surfaces on a clean grab.'),
    row('Borrowed Thunder','Back + △ / K','Commit one stored shot on startup. Heavy plus 60 raw in either form.')
  ],
  specials:[
    row('Mine Now','Neutral R1 / L, empty','Ground or air. 4f startup, 10f catch, 18f recovery. Face the incoming shot. 64f cooldown.',0),
    row('Return to Sender','Neutral R1 / L, loaded','Ground or air. Spends the shot at commitment. 110% of base damage, clamped to 60–160 raw. Slot expires in 8 seconds.',0),
    row('Shoulder Drive','Forward + R1 / L, uncoated','112 raw; committed advancing strike.',0),
    ...Object.entries(MATERIALS).map(([id,m])=>row(m.move,'Forward + R1 / L, '+m.name,
      h[KEVIN_RUSH[id]].damage+' raw. '+m.property,0)),
    row('Scrap Quarry','Up + R1 / W + L (ground)','One 135-raw boulder. Fragments are visual.',15),
    row('Apply Sample','Down + R1 / S + L (ground)','Applies the selected carried sample after visible startup.',8),
    row('Field Absorption','Back + R1 / L (ground)','Sample a marked prop at contact range. Failed contact preserves the coating.',0),
    row('Aerial Drive','Air forward + R1 / L (human)','91 raw. Up, down and back alone are unused in human air. Neutral keeps Mine Now / Return.',0),
    row('Arc Torrent','Forward + R1 / L (Ultimate)','174 raw maximum. One committed beam contact.',0),
    row('Halo Launcher','Up + R1 / W + L (Ultimate)','148 raw rising anti-air.',0),
    row('Shard Volley','Down + R1 / S + L (Ultimate)','Three 54-raw shots before combo scaling.',0),
    row('Claw Counter','Back + R1 / L (Ultimate)','Brief frontal melee counter; riposte is 138 raw. Whiff has clear recovery.',0),
    row('Aerial Furnace','Air direction + R1 / L (Ultimate)','156 raw; one use per airtime. Neutral keeps Mine Now / Return.',0)
  ],
  ultimate: row('Absorption Overload / Everything You Threw at Me','R2 / U',
    'Enter Ultimate Kevin for 12 seconds after a committed morph. Press again on the ground to surrender the form for a blockable 180–360 raw finisher. Miss or hold against guard spends the form.',100),
  combos:[]
}
