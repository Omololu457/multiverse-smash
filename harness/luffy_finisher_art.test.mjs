import assert from 'node:assert/strict'
import {luffy} from '../luffyData.js'
import {startFinishWindow,clearFatalityCinematic,updateFatalityCinematic,fatalityDone,fatalityWasPerformed} from '../fatalityCinematic.js'
import {activateShisuiFallenFatality,updateShisuiFallenFatalityCinematic,isShisuiFallenFatalityActive,clearShisuiFallenFatalityCinematic} from '../shisuiFallenFatalityCinematic.js'
const urls=[],oldImage=globalThis.Image
const sound={playJuiceSfx(){}}
globalThis.Image=class{set src(s){urls.push(s)}}
try{
 const winner={rosterKey:'goku'},victim={...luffy,health:0}
 assert.equal(luffy.fatalityVictimArt,false)
 assert(startFinishWindow(winner,victim));assert.equal(urls.length,0,'Luffy never requests nonexistent derived gore art')
 updateFatalityCinematic({ultPressed:false,sound});updateFatalityCinematic({ultPressed:true,sound})
 for(let i=0;i<138;i++)updateFatalityCinematic({sound})
 assert(fatalityDone());assert(fatalityWasPerformed(),'FX-only fallback preserves the shared finisher interaction and timing');clearFatalityCinematic()
 const alive={...luffy,health:10};assert(activateShisuiFallenFatality({rosterKey:'shisui_fallen'},alive));assert.equal(urls.length,0)
 for(let i=0;i<140;i++)updateShisuiFallenFatalityCinematic({sound})
 assert(!isShisuiFallenFatalityActive());assert.equal(alive.health,0,'existing Shisui resolution remains effective against Luffy')
 assert(startFinishWindow(winner,{rosterKey:'goku'}));assert.deepEqual(urls,['./fatality/goku_ashen.png'],'other fighters keep their authored image path');clearFatalityCinematic()
 assert(activateShisuiFallenFatality(winner,{rosterKey:'goku',health:10}));assert.equal(urls.at(-1),'./fatality/goku_chopped.png')
 console.log('LUFFY FINISHER ART: shared window, Shisui resolution, legacy paths and no missing-art requests passed')
}finally{clearFatalityCinematic();clearShisuiFallenFatalityCinematic();globalThis.Image=oldImage}
