// Dash Parr — WebAudio placeholder sound (presentation only; never touches the sim).
// Pitch jitter (±3%) and noise samples come from an integer hash of (match-local cue counter, cue id, player
// index) — never Math.random. The counter lives here (audio state), not in GAME_STATE.
import {sound} from './sound.js'
let counter=0
// The shared SoundManager's context + master bus (respects the SFX mute / master volume). Never creates its own.
function ac(){return sound?._ready&&!sound._sfxMuted&&sound._ctx&&sound._ctx.state!=='closed'?sound._ctx:null}
const out=()=>sound._master||sound._ctx.destination
function hash(a,b,c){let h=((a|0)^0x9e3779b9)>>>0;h=Math.imul(h^((b|0)+0x85ebca6b),0xcc9e2d51)>>>0;h=Math.imul(h^((c|0)+0x27d4eb2f),0x1b873593)>>>0;h^=h>>>15;h=Math.imul(h,0x85ebca6b)>>>0;h^=h>>>13;return (h>>>0)/4294967296}
const pitch=(n,pi)=>1+(hash(counter,n,pi)-0.5)*0.06
const vol=()=>1
function tone(type,f0,f1,dur,gain,at=0){const c=ac();if(!c||vol()<=0)return;const t=c.currentTime+at,o=c.createOscillator(),g=c.createGain()
 o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur)
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(gain*vol(),t+0.005);g.gain.exponentialRampToValueAtTime(0.0001,t+dur)
 o.connect(g).connect(out());o.start(t);o.stop(t+dur+0.02)}
function noise(dur,gain,pi,hp=2000,sweep=null,at=0){const c=ac();if(!c||vol()<=0)return;const t=c.currentTime+at,n=Math.max(1,Math.floor(c.sampleRate*dur)),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0)
 for(let i=0;i<n;i++)d[i]=hash(counter,i,pi)*2-1
 const s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();s.buffer=b;fl.type='highpass';fl.frequency.setValueAtTime(hp,t);if(sweep)fl.frequency.exponentialRampToValueAtTime(sweep,t+dur)
 g.gain.setValueAtTime(sweep?0.0001:gain*vol(),t);if(sweep)g.gain.exponentialRampToValueAtTime(gain*vol(),t+dur*0.9);g.gain.exponentialRampToValueAtTime(0.0001,t+dur)
 s.connect(fl).connect(g).connect(out());s.start(t);s.stop(t+dur+0.02)}
// Cue table (brief Phase 8). pi = player index for the hash.
export function playDashParrCue(cue,f){
 counter++;const pi=f?.playerNumber||1,p=pitch(cue.length,pi)
 try{switch(cue){
  case 'step':tone('square',220*p,220*p,0.02,0.05);break                                   // footsteps at Sprint
  case 'whoosh':noise(0.18,0.22,pi,1800*p);break                                           // Blur Dash / Sidestep / Panic Run
  case 'flurry':for(let k=0;k<8;k++)tone('square',600*pitch(k,pi),600*pitch(k,pi),0.025,0.07,k*0.045);break   // 8 × 25 ms pops
  case 'laps':tone('sine',300*p,1200*p,0.6,0.12);break                                     // Doppler loop
  case 'blur':tone('triangle',1760*p,1760*p,0.12,0.12);break                              // Blur tier reached
  case 'rush':noise(2.5,0.2,pi,300,6000);tone('sine',80*p,80*p,0.35,0.3,2.5);break        // rising sweep + thump
  case 'flashOn':tone('sine',1200*p,240*p,0.5,0.14);tone('triangle',1760*p,1760*p,0.12,0.1,0.05);break   // Flash Time: time bends down + ping
  case 'flashOff':tone('sine',240*p,1200*p,0.35,0.12);break                               // time snaps back
  case 'pop':case 'hit':case 'rushHit':tone('square',(cue==='hit'?420:600)*p,(cue==='hit'?260:600)*p,0.03,0.06);break
  default:break
 }}catch(_){}
}
