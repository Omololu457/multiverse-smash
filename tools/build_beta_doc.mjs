// tools/build_beta_doc.mjs
// Generates the MULTIVERSE SMASH — BETA 1 gameplay document from the game's own kit data
// (harness/kits_dump.json, produced by the dumpKits harness hook). Outputs a styled HTML (→ PDF)
// and a clean Markdown. All move/combo/ultimate data is the game's authored kit data — not invented.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kits = JSON.parse(fs.readFileSync(path.join(ROOT, "harness", "kits_dump.json"), "utf8"));

// ── Universe metadata: display name, accent, one-line flavour ──────────────────
const UNI = {
  dragon_ball:     { name: "Dragon Ball",     accent: "#f4b63a", tag: "Ki blasts, beam wars & Saiyan transformations" },
  naruto:          { name: "Naruto",          accent: "#f6852e", tag: "Shadow clones, jutsu & ninja mind-games" },
  jujutsu_kaisen:  { name: "Jujutsu Kaisen",  accent: "#7c5cff", tag: "Cursed energy, domains & frame-tight sorcery" },
  hunter_x_hunter: { name: "Hunter × Hunter", accent: "#2fbf7a", tag: "Nen specialists with wildly different rules" },
  demon_slayer:    { name: "Demon Slayer",    accent: "#33c0c0", tag: "Breathing forms & blade dashes" },
  power_rangers:   { name: "Power Rangers",   accent: "#ff3b6b", tag: "Morphed strikers & zord-scale finishers" },
  dc:              { name: "DC",              accent: "#3a6ff0", tag: "Icons of the DC universe" },
  ben_10:          { name: "Ben 10",          accent: "#9ede3a", tag: "Omnitrix alien-swapping toolkits" },
  ben10:           { name: "Ben 10",          accent: "#9ede3a", tag: "Omnitrix universe" },
  invincible:      { name: "Invincible",      accent: "#ec4f6e", tag: "Viltrumite power & brutal exchanges" },
  rick_and_morty:  { name: "Rick and Morty",  accent: "#6fe0b0", tag: "Portal gadgets & chaotic science" },
  bleach:          { name: "Bleach",          accent: "#38c0e0", tag: "Reiatsu pressure & zanpakutō releases" },
  horror:          { name: "Horror",          accent: "#c0304a", tag: "Slashers with relentless, brutal pressure" },
  saiki_k:         { name: "Saiki K",         accent: "#e07cff", tag: "Psychic utility & reality-bending tricks" },
  one_punch_man:   { name: "One Punch Man",   accent: "#f2b705", tag: "Overwhelming force & cyborg firepower" },
  marvel:          { name: "Marvel",          accent: "#e62429", tag: "Web-slingers & armored icons" },
  deathnote:       { name: "Death Note",      accent: "#c9ccd6", tag: "Mind-game manipulators" },
  baki:            { name: "Baki",            accent: "#d64545", tag: "Pure hand-to-hand monsters" },
  hajime_no_ippo:  { name: "Hajime no Ippo",  accent: "#e63946", tag: "Boxing — footwork, weaving & signature blows" },
  original:        { name: "Originals",       accent: "#9aa7b5", tag: "House-original fighters" },
};
const uniMeta = u => UNI[u] || { name: (u || "Other").split("_").map(p => p[0]?.toUpperCase() + p.slice(1)).join(" "), accent: "#9aa7b5", tag: "" };
// stable universe display order (marquee first)
const UNI_ORDER = ["dragon_ball","naruto","jujutsu_kaisen","bleach","hunter_x_hunter","demon_slayer","one_punch_man","baki","hajime_no_ippo","deathnote","saiki_k","rick_and_morty","dc","marvel","invincible","power_rangers","ben_10","ben10","horror","original"];

// ── group fighters by universe ──
const byUni = {};
for (const k of kits) (byUni[k.universe] ||= []).push(k);
for (const u in byUni) byUni[u].sort((a, b) => a.name.localeCompare(b.name));
const universes = [...new Set([...UNI_ORDER.filter(u => byUni[u]), ...Object.keys(byUni)])];

// ── helpers ──
const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const hex2rgb = h => { h=h.replace("#",""); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; };
const rgba = (h,a) => { const [r,g,b]=hex2rgb(h); return `rgba(${r},${g},${b},${a})`; };
const hasRealSpecials = k => k.specials && k.specials.length && k.specials[0].name !== "—";

// ── CONTENT: controls, mechanics, beta appendix (authored from the live codebase) ──
const CONTROLS = [
  ["Move left / right", "A / D"], ["Jump / Up", "W"], ["Crouch", "S"], ["Block (guard)", "; (semicolon)"],
  ["Light attack", "J"], ["Heavy attack", "K"], ["Up-Attack (launcher)", "I"],
  ["Special", "L"], ["Ultimate (full meter)", "U"], ["Grab", "O"], ["Charge / Transform / Omnitrix", "P"], ["Dash", "double-tap A or D"],
];
const CONTROLS_P2 = [
  ["Move", "← / →"], ["Jump", "↑"], ["Crouch", "↓"], ["Light / Heavy", "1 / 2"], ["Up-Attack", "3"], ["Special", "4"], ["Ultimate", "5"], ["Grab", "9"], ["Charge", "0"],
];
const SPECIAL_SCHEME = [
  ["Special (L)", "the character's neutral special / 1st technique"],
  ["Down + Special (S + L)", "their 2nd special"],
  ["Forward + Special (toward foe + L)", "their 3rd special or mobility move"],
  ["Up / Back + Special", "some fighters have extra directional specials — experiment"],
  ["Ultimate (U, full meter)", "their ultimate / domain / finisher"],
  ["Up-Attack (I)", "launches BOTH fighters upward — your gateway to air combos"],
];
const MECHANICS = [
  ["Meter builds as you fight", "Landing and taking hits fills your energy bar (Ki / cursed energy / reiatsu, etc.). Specials cost meter; the Ultimate needs a full bar."],
  ["Combo scaling", "Damage tapers across a combo (100% → 92% → 84% → 76% → 70% → 65%), so longer strings pay less per hit — enders matter more than length."],
  ["Combo Breaker", "While you're being combo'd (3+ hits), you can burst out: it costs meter (or a limited per-round stock if you're empty) and gives you brief invulnerability. Use it to escape a beating — but it's not spammable."],
  ["Launchers & air combos", "Up-Attack (I) pops both fighters up. Follow with Air attacks to juggle. This is the core of most bread-and-butter routes."],
  ["Blocking & Flawless Block", "Hold ; to guard. Guarding the instant an attack lands (a fresh, well-timed block) rewards a tighter punish window — reactive defense is rewarded, mashing guard is not."],
  ["Transformations", "Several fighters (Goku, Gohan, Piccolo, Vegeta and more) transform by holding Charge (P) with enough meter — boosting damage/speed/defense, draining over time. It's a resource decision, not free."],
  ["Grabs", "Grab (O) beats a turtling blocker and can't be blocked — mix it into your pressure so defenders can't just hold guard."],
];
const WATCHLIST = [
  ["Placeholder / broken art", "Any fighter that renders as a plain box, a wrong sprite, or a missing pose (win/lose/intro). Note who + when."],
  ["Dead or broken inputs", "A special/ultimate that doesn't fire, fires the wrong move, or only works sometimes. Note the exact input + character."],
  ["Touch-of-death / infinites", "Any combo that loops forever or kills from one opening without a Combo Breaker escape. This is top-priority to report."],
  ["Combo Breaker failures", "Times you were being combo'd (3+ hits) with meter/stock but couldn't break out."],
  ["Balance outliers", "A move or character that feels clearly too strong or useless. Name the move, not just the character."],
  ["Control-reference mismatch", "The in-game MOVE LIST control hints are out of date — the REAL defaults are the ones in this doc (Special = L, Ultimate = U). Confirm the in-game text and flag it."],
  ["Undocumented specials", "Some fighters don't list named specials in the in-game move list yet — try Special + each direction in Training and tell us what you find (and whether it's obvious)."],
  ["Audio gaps", "Missing voice lines / SFX, or the wrong clip. Several characters are known-silent — note which stood out."],
  ["Crashes / freezes / softlocks", "Anything that stops the match or the menus. Write down exactly what you were doing right before."],
  ["UI / theme glitches", "Any menu that looks broken, text overflowing off-screen, or a theme that renders wrong (try a few themes + a couple of character UIs)."],
];
const QUESTIONS = [
  "Which 2–3 characters felt the STRONGEST, and which felt the WEAKEST? Why?",
  "Was there any move that felt unfair (too strong / unreactable) or completely useless?",
  "Did combos flow well, or did they feel stiff / drop unexpectedly?",
  "Was the CPU difficulty about right, too easy, or too hard?",
  "Were the controls and mechanics clear from the start? What confused you?",
  "Who was your FAVOURITE character to play, and why?",
  "Did you hit any crashes, freezes, or visual glitches? What were you doing?",
  "Which UI theme did you like best? Did you notice the per-character UI colours?",
  "How did the game FEEL overall — snappy and responsive, or floaty / laggy?",
  "On a scale of 1–10, how likely are you to play again — and what's the one change that would raise that number?",
];

// ── HTML ──────────────────────────────────────────────────────────────────────
function moveRows(list, cols) {
  return (list||[]).map(m => `<tr><td class="mv">${esc(m.name)}</td><td class="in">${esc(m.input||m.sequence||"")}</td>${cols===3?`<td class="cost">${m.cost?esc(m.cost)+" ⚡":""}</td>`:""}<td class="ds">${esc(m.desc||"")}</td></tr>`).join("");
}
// Match each card's accent to the fighter's in-game UI theme (theme.js CHARACTER_THEME_OVERRIDES),
// so e.g. Goku Black's card is pink like his UI, Ben 10's is Omnitrix green.
const THEME_OVERRIDE = { goku_black: "#f65fa6", ben10: "#8be04e" };
function charCard(k) {
  const acc = THEME_OVERRIDE[k.key] || k.color || uniMeta(k.universe).accent;
  const diff = k.difficulty || "—";
  const st = k.stats || {};
  const statBar = (label, v, max) => v==null ? "" : `<div class="stat"><span>${label}</span><div class="track"><i style="width:${Math.round(Math.min(1,v/max)*100)}%;background:${acc}"></i></div></div>`;
  const specials = hasRealSpecials(k)
    ? `<table class="mvt"><thead><tr><th>Special</th><th>Input</th><th>Cost</th><th>Notes</th></tr></thead><tbody>${moveRows(k.specials,3)}</tbody></table>`
    : `<div class="note">Signature specials aren't listed in the data yet — perform them with <b>Special (L)</b>, <b>Down + Special</b>, and <b>Forward + Special</b>. Try each in Training. <span class="flag">(beta: document these)</span></div>`;
  const mob = k.mobility && k.mobility.name && k.mobility.name!=="—" ? `<tr><td class="mv">${esc(k.mobility.name)}</td><td class="in">${esc(k.mobility.input)}</td><td class="cost">${k.mobility.cost?esc(k.mobility.cost)+" ⚡":""}</td><td class="ds">${esc(k.mobility.desc)}</td></tr>` : "";
  const ult = k.ultimate && k.ultimate.name ? `<tr class="ult"><td class="mv">★ ${esc(k.ultimate.name)}</td><td class="in">${esc(k.ultimate.input||"Ultimate")}</td><td class="cost">${k.ultimate.cost?esc(k.ultimate.cost)+" ⚡":""}</td><td class="ds">${esc(k.ultimate.desc)}</td></tr>` : "";
  return `
  <section class="card" style="--acc:${acc}" id="c-${esc(k.key)}">
    <div class="chead">
      <div class="cname"><span class="dot"></span>${esc(k.name)}</div>
      <div class="ctags"><span class="tag">${esc(k.type||"Fighter")}</span><span class="tag diff d-${esc(String(diff).toLowerCase())}">${esc(diff)}</span>${k.energy&&k.energy!=="None"?`<span class="tag">${esc(k.energy)}</span>`:""}</div>
    </div>
    ${k.summary?`<p class="summ">${esc(k.summary)}</p>`:""}
    ${k.passive&&k.passive.name&&k.passive.name!=="—"?`<div class="passive"><b>Passive — ${esc(k.passive.name)}:</b> ${esc(k.passive.effect)}</div>`:""}
    <div class="cols">
      <div class="col">
        <h4>Normals</h4>
        <table class="mvt"><tbody>${moveRows(k.normals,2)}</tbody></table>
        <h4>Specials &amp; Ultimate</h4>
        ${specials}
        ${(mob||ult)?`<table class="mvt"><tbody>${mob}${ult}</tbody></table>`:""}
      </div>
      <div class="col">
        <h4>Combos &amp; how to use</h4>
        ${(k.combos||[]).map(c=>`<div class="combo"><div class="cn">${esc(c.name)}</div><div class="seq">${esc(c.sequence)}</div><div class="cd">${esc(c.desc)}</div></div>`).join("") || `<div class="note">Experiment in Training — link normals into Up-Attack for air juggles.</div>`}
        ${(st.health||st.attack)?`<h4>Stats</h4><div class="stats">${statBar("HP",st.health,1300)}${statBar("ATK",st.attack,100)}${statBar("DEF",st.defense,100)}${statBar("SPD",st.speed,100)}</div>`:""}
      </div>
    </div>
  </section>`;
}
function tocHtml() {
  return universes.map(u=>{const m=uniMeta(u);return `<div class="tocU" style="--acc:${m.accent}"><h3>${esc(m.name)}</h3><div class="toclist">${byUni[u].map(k=>`<a href="#c-${esc(k.key)}">${esc(k.name)}</a>`).join("")}</div></div>`;}).join("");
}
function table(rows, head) { return `<table class="ref">${head?`<thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead>`:""}<tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${i===0?'k':''}">${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`; }

const CSS = `
:root{--bg0:#080a16;--bg1:#0e1226;--ink:#eaf0ff;--dim:#9fb0d0;--line:rgba(150,180,230,.14);--a:#7aa8ff;}
*{box-sizing:border-box}
body{margin:0;background:linear-gradient(160deg,#070912,#0d1030 60%,#140a26);color:var(--ink);font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.wrap{max-width:1080px;margin:0 auto;padding:0 40px}
a{color:var(--a);text-decoration:none}
h1,h2,h3,h4{margin:0 0 .4em}
.cover{min-height:96vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;position:relative;overflow:hidden;page-break-after:always}
.cover::before{content:"";position:absolute;inset:0;background:radial-gradient(1200px 700px at 30% 20%,rgba(122,90,255,.25),transparent),radial-gradient(1000px 700px at 75% 70%,rgba(244,80,140,.22),transparent),radial-gradient(900px 600px at 60% 40%,rgba(34,211,238,.14),transparent)}
.cover *{position:relative}
.badge{letter-spacing:.5em;font-weight:700;color:#ffd36e;font-size:14px;margin-bottom:18px;text-transform:uppercase}
.title{font-size:76px;font-weight:900;line-height:1;background:linear-gradient(90deg,#7dd3fc,#c084fc,#f472b6);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 60px rgba(160,120,255,.3)}
.sub{font-size:22px;color:#cdd8f5;margin-top:16px;font-weight:600}
.meta{margin-top:26px;color:var(--dim);font-size:14px}
.pill{display:inline-block;padding:7px 16px;border:1px solid var(--line);border-radius:999px;margin:6px;background:rgba(255,255,255,.03);color:#cfe0ff;font-size:13px}
.section{padding:44px 0;border-top:1px solid var(--line)}
.section h2{font-size:30px;background:linear-gradient(90deg,#eaf0ff,var(--a));-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{color:var(--dim);max-width:70ch;margin:.2em 0 1.4em}
.ref{width:100%;border-collapse:collapse;margin:8px 0 18px}
.ref td,.ref th{padding:8px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.ref th{color:#bcd0ff;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.ref td.k{color:#fff;font-weight:600;white-space:nowrap}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.callout{border:1px solid var(--line);border-left:3px solid var(--a);border-radius:10px;padding:12px 16px;margin:10px 0;background:rgba(255,255,255,.02)}
.callout b{color:#fff}
.tocU{margin:14px 0;padding-left:14px;border-left:3px solid var(--acc)}
.tocU h3{color:var(--acc);font-size:16px;margin:0 0 6px}
.toclist{display:flex;flex-wrap:wrap;gap:6px 14px}
.uhead{margin:40px 0 6px;padding:16px 20px;border-radius:14px;background:linear-gradient(90deg,var(--ub),transparent);border:1px solid var(--line);border-left:4px solid var(--ua)}
.uhead h2{font-size:26px;color:#fff;margin:0}
.uhead p{margin:2px 0 0;color:var(--dim)}
.card{--acc:#7aa8ff;margin:18px 0;padding:20px 22px;border:1px solid var(--line);border-left:4px solid var(--acc);border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01));page-break-inside:avoid;box-shadow:0 0 0 1px rgba(0,0,0,.2),0 14px 40px -24px var(--acc)}
.chead{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.cname{font-size:22px;font-weight:800;display:flex;align-items:center;gap:10px}
.dot{width:12px;height:12px;border-radius:50%;background:var(--acc);box-shadow:0 0 14px var(--acc)}
.ctags{display:flex;gap:6px;flex-wrap:wrap}
.tag{font-size:11px;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:#cfe0ff}
.tag.diff{font-weight:700}
.d-easy{color:#86efac}.d-medium{color:#fcd34d}.d-hard{color:#fb7185}.d-very.hard,.d-expert{color:#f43f5e}
.summ{color:#c7d4ee;margin:10px 0}
.passive{font-size:13px;color:var(--dim);border:1px dashed var(--line);border-radius:9px;padding:8px 12px;margin:8px 0}
.passive b{color:var(--acc)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:12px}
.col h4{font-size:12px;text-transform:uppercase;letter-spacing:.09em;color:var(--acc);margin:14px 0 6px}
.mvt{width:100%;border-collapse:collapse}
.mvt td,.mvt th{padding:5px 8px;border-bottom:1px solid rgba(150,180,230,.08);font-size:13px;vertical-align:top}
.mvt th{font-size:10px;text-transform:uppercase;color:#9fb0d0;text-align:left;letter-spacing:.06em}
.mvt .mv{color:#fff;font-weight:600;white-space:nowrap}
.mvt .in{color:#a9c4ff;white-space:nowrap;font-size:12px}
.mvt .cost{color:#ffd36e;white-space:nowrap;font-size:12px}
.mvt .ds{color:var(--dim)}
.mvt tr.ult .mv{color:var(--acc)}
.combo{border:1px solid var(--line);border-radius:9px;padding:8px 11px;margin:7px 0;background:rgba(255,255,255,.02)}
.combo .cn{font-weight:700;color:#fff;font-size:13px}
.combo .seq{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--acc);font-size:13px;margin:2px 0}
.combo .cd{color:var(--dim);font-size:12px}
.note{font-size:13px;color:var(--dim);border:1px dashed var(--line);border-radius:9px;padding:9px 12px}
.flag{color:#fca5a5}
.stats{display:flex;flex-direction:column;gap:5px;margin-top:4px}
.stat{display:flex;align-items:center;gap:8px;font-size:11px;color:#9fb0d0}
.stat span{width:30px}
.track{flex:1;height:7px;background:rgba(255,255,255,.08);border-radius:5px;overflow:hidden}
.track i{display:block;height:100%;border-radius:5px}
.foot{padding:40px;text-align:center;color:var(--dim);border-top:1px solid var(--line)}
ol.q li,ul.w li{margin:8px 0}
ul.w li b{color:#fff}
@page{margin:14mm}
/* PRINT/PDF: keep the dark themed look + accent colours, but swap the heavy full-page gradients &
   glows for flat fills so the PDF stays small enough to email to testers. */
@media print{
  body{background:#0a0d1a}
  .cover::before{background:radial-gradient(700px 500px at 40% 30%,rgba(122,90,255,.28),transparent)}
  .card{box-shadow:none;background:rgba(255,255,255,.03)}
  .section h2,.title{text-shadow:none}
}
`;

const totalSpecials = kits.filter(hasRealSpecials).length;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Multiverse Smash — Beta 1</title><style>${CSS}</style></head><body>
<div class="cover"><div class="badge">Beta 1 · Gameplay Guide</div>
  <div class="title">MULTIVERSE<br>SMASH</div>
  <div class="sub">A crossover fighting game across ${universes.length} worlds</div>
  <div class="meta">${kits.length} playable fighters · movesets, combos &amp; how to play<br>Beta testing build — generated from the live game data</div>
  <div style="margin-top:26px"><span class="pill">${kits.length} Fighters</span><span class="pill">${universes.length} Universes</span><span class="pill">Combos + How-To</span><span class="pill">Beta Watch-list</span></div>
</div>
<div class="wrap">

<div class="section"><h2>How to read this guide</h2>
<p class="lead">This is your beta player's handbook. It opens with the controls and the core mechanics, then gives every fighter their own card — archetype, passive, normals, specials, ultimate, bread-and-butter combos, and how to use them. The final pages are what we most need from you: a watch-list of things to look for and a set of feedback questions. Every move and combo here is pulled straight from the game's own data, so it matches what you'll see in-game.</p>
</div>

<div class="section"><h2>Controls</h2>
<div class="grid2">
<div><h3>Player 1 (keyboard)</h3>${table(CONTROLS)}</div>
<div><h3>Player 2 (keyboard)</h3>${table(CONTROLS_P2)}<p class="lead" style="font-size:13px">Controllers are supported too — plug in and the menus show the right glyphs.</p></div>
</div>
<h3 style="margin-top:18px">Performing specials</h3>
${table(SPECIAL_SCHEME)}
</div>

<div class="section"><h2>Core mechanics</h2>
<p class="lead">A quick primer so beta feedback lands on the right things.</p>
${MECHANICS.map(([t,d])=>`<div class="callout"><b>${esc(t)}.</b> ${esc(d)}</div>`).join("")}
</div>

<div class="section"><h2>Roster — jump to a fighter</h2>${tocHtml()}</div>

<div class="section"><h2>The Fighters</h2>
<p class="lead">${kits.length} fighters across ${universes.length} universes. ${totalSpecials} have their specials fully listed; the rest have them coded in-game — perform them with Special + a direction (flagged below so you can help us document them).</p>
${universes.map(u=>{const m=uniMeta(u);return `<div class="uhead" style="--ua:${m.accent};--ub:${rgba(m.accent,.16)}"><h2>${esc(m.name)} <span style="font-size:14px;color:var(--dim);font-weight:500">· ${byUni[u].length} fighters</span></h2><p>${esc(m.tag)}</p></div>${byUni[u].map(charCard).join("")}`;}).join("")}
</div>

<div class="section"><h2>🔎 Beta test — what to watch for</h2>
<p class="lead">If you hit any of these, please note the character, the input, and what you were doing. Bugs with a clear "how to reproduce" are gold.</p>
<ul class="w">${WATCHLIST.map(([t,d])=>`<li><b>${esc(t)}:</b> ${esc(d)}</li>`).join("")}</ul>
</div>

<div class="section"><h2>💬 Questions for you</h2>
<p class="lead">After a few matches, we'd love your answers to these:</p>
<ol class="q">${QUESTIONS.map(q=>`<li>${esc(q)}</li>`).join("")}</ol>
</div>

</div>
<div class="foot">Multiverse Smash — Beta 1 · Thank you for testing. Every note makes the game better. 🎮</div>
</body></html>`;

fs.writeFileSync(path.join(ROOT, "BETA1_GAMEPLAY.html"), html);
console.log("wrote BETA1_GAMEPLAY.html", (html.length/1024|0)+"kb", "·", kits.length, "fighters ·", totalSpecials, "with listed specials");

// ── Markdown (clean, readable in any text editor) ──
const md = [];
md.push(`# MULTIVERSE SMASH — BETA 1`, ``, `_A crossover fighting game across ${universes.length} worlds · ${kits.length} playable fighters._`, ``, `Beta gameplay guide — generated from the live game data. Every move & combo matches the in-game kit.`, ``, `---`, ``);
md.push(`## Controls (Player 1)`, ``, `| Action | Key |`, `|---|---|`, ...CONTROLS.map(([a,b])=>`| ${a} | \`${b}\` |`), ``);
md.push(`### Performing specials`, ``, ...SPECIAL_SCHEME.map(([a,b])=>`- **${a}** — ${b}`), ``, `---`, ``);
md.push(`## Core mechanics`, ``, ...MECHANICS.map(([t,d])=>`- **${t}.** ${d}`), ``, `---`, ``);
md.push(`## The Fighters`, ``);
for (const u of universes) {
  const m = uniMeta(u);
  md.push(`### ${m.name} — ${byUni[u].length} fighters`, `_${m.tag}_`, ``);
  for (const k of byUni[u]) {
    md.push(`#### ${k.name}  ·  ${k.type||"Fighter"}  ·  ${k.difficulty||"—"}`);
    if (k.summary) md.push(``, k.summary);
    if (k.passive?.name && k.passive.name!=="—") md.push(``, `- **Passive — ${k.passive.name}:** ${k.passive.effect}`);
    md.push(``, `**Normals:** ` + (k.normals||[]).map(n=>`${n.name} (${n.input})`).join(" · "));
    if (hasRealSpecials(k)) md.push(``, `**Specials:**`, ...k.specials.map(s=>`- ${s.name} — \`${s.input}\`${s.cost?` (${s.cost}⚡)`:""}: ${s.desc}`));
    else md.push(``, `**Specials:** _coded in-game — perform with Special (L), Down+Special, Forward+Special; try each in Training._`);
    if (k.mobility?.name && k.mobility.name!=="—") md.push(`- Mobility: ${k.mobility.name} — \`${k.mobility.input}\`: ${k.mobility.desc}`);
    if (k.ultimate?.name) md.push(`- ★ Ultimate: ${k.ultimate.name} — \`${k.ultimate.input||"Ultimate"}\`${k.ultimate.cost?` (${k.ultimate.cost}⚡)`:""}: ${k.ultimate.desc}`);
    if ((k.combos||[]).length) { md.push(``, `**Combos:**`); for (const c of k.combos) md.push(`- **${c.name}:** \`${c.sequence}\` — ${c.desc}`); }
    md.push(``);
  }
  md.push(`---`, ``);
}
md.push(`## Beta test — what to watch for`, ``, ...WATCHLIST.map(([t,d])=>`- **${t}:** ${d}`), ``);
md.push(`## Questions for you`, ``, ...QUESTIONS.map((q,i)=>`${i+1}. ${q}`), ``, `---`, ``, `_Thank you for testing Multiverse Smash — Beta 1._`);
fs.writeFileSync(path.join(ROOT, "BETA1_GAMEPLAY.md"), md.join("\n"));
console.log("wrote BETA1_GAMEPLAY.md");
