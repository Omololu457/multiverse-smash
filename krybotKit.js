// Player-facing instructions; all button names are logical configured actions.
export const KRYBOT_KIT = {
  type:'Infantry / Ranged Pressure',energy:'Energy',difficulty:'Medium',
  summary:'Fragile Troobian infantry. Quick jabs, a committed kick, finite blaster fire and one allied covering unit.',
  passive:{name:'Coordinated Fire',effect:'Unblocked Heavy or command knock-away marks for 60f. An allied covering shot consumes it for +2 fixed pushback only. Squad-leader coordination is a gameplay adaptation.'},
  basics:[
    {name:'Servo Jab → Follow-up Strike → Driving Kick',input:'Light, fresh Light, fresh Light',desc:'5/6/10f startup; raw 16/18/28. Three stages maximum; clean-hit recovery retaps.'},
    {name:'Piston Kick',input:'Heavy',desc:'14f startup; raw 50. Marks on hit. −16f on normal block.'},
    {name:'Ankle Strike',input:'Down + Light or Heavy',desc:'8f startup; raw 24; low.'},
    {name:'Rising Intercept',input:'Up + Heavy / Up-Attack',desc:'12f startup; raw 40. Raised-arm intercept adapted from the jump pose. Jump manually to pursue.'},
    {name:'Aerial Boot',input:'Air Light / Heavy; Air Down + Special',desc:'9f startup; raw 28. Same extended kick pose; no spike or extra special.'},
    {name:'Advancing Strike → Kick → Knock-away',input:'Forward + Heavy, fresh Heavy, fresh Heavy',desc:'Clean-hit recovery retaps. Up + final Heavy branches to Rising Intercept.'},
    {name:'Infantry Throw',input:'Grab',desc:'Shared grab/tech rules; raw 24.'},
  ],
  specials:[
    {name:'Arm Blaster',input:'Neutral + Special',cost:12,desc:'15f startup, raw 36; one shot at a time, 468px maximum travel. Jump or block it.'},
    {name:'Breach Step',input:'Forward + Special',cost:15,desc:'13f startup, raw 46; advances 120px; no armor. −25f on block.'},
    {name:'Leap Intercept',input:'Down + Special (ground)',cost:18,desc:'11f startup, raw 40. Forward leap capped at 120px; one contact and 18f landing recovery.'},
    {name:'Covering Unit',input:'Back + Special',cost:25,desc:'24f call; 480f cooldown. One allied Krybot enters, aims, fires raw 24 and exits. One valid hit destroys it before firing.'},
  ],
  mobility:{name:'Infantry movement',input:'Move / Jump / double-tap direction',cost:0,desc:'One moderate jump; normal walk and dash. No armor, healing or immunity.'},
  ultimate:{name:'Troobian Crossfire',input:'Ultimate (100 Energy)',cost:100,desc:'30f opening shot must hit unblocked. Two scripted allies and a local explosion: raw 30+35+35+100, shared scaling. No capture; 60f whiff recovery.'},
  combos:[
    {name:'Jab pressure',sequence:'Light → Light → Light',desc:'Fresh clean-hit retaps; 34 measured damage at 72px against Krybot.'},
    {name:'Kick into blaster',sequence:'Light → Heavy → Neutral Special',desc:'58 measured damage; costs 12.'},
    {name:'Infantry command chain',sequence:'Forward Heavy → Heavy → Heavy',desc:'53 measured damage; final Up+Heavy launches instead.'},
    {name:'Manual pursuit',sequence:'Up-Attack → Jump → Air Light',desc:'38 measured damage. You must press Jump.'},
    {name:'Coordinated pressure',sequence:'Heavy → Back Special',desc:'Escapable pressure; 43 measured damage if the covering shot connects. Jump, block or hit the helper.'},
    {name:'Heavy confirm',sequence:'Heavy → Ultimate',desc:'120 measured damage in the close-range test; costs 100. Confirm the Heavy before committing.'},
  ],
}
