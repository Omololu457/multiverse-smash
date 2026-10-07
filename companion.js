// Multiverse Smash — COMPANION SECOND-SCREEN receiver (opt-in, READ-ONLY, up to 4 player-slots).
// Loads in its own window (index.html?view=companion&player=N → companion.html). Imports NO game code,
// holds NO sim. It only RECEIVES a read-only snapshot and paints DOM. There is no path back to the game:
// it never sends game input/state. Two transports feed the SAME handler (onMessage):
//   • BroadcastChannel("mv-companion")  — windows on the same computer (multi-monitor)
//   • LAN relay (LanClient, ?code=XXXX) — phones / iPads / other laptops on the same WiFi (subscribe-only)
//
// Snapshot schema (sender = game.js, all pure reads):
//   { k:"meta", mode, padLabel, buttons, maxPlayers,
//     players:[ { pn, slot, accent, team, key, name, universe, type, kit } ] }
//   { k:"snap", frame, roundTimer, roundNumber, roundWins, mode, combo,
//     players:[ { pn, slot, accent, team, key, hp, maxHp, en, maxEn, ultCd, ultReady, dashCd, dashCdMax, move, combo, eliminated } ],
//     training:{ enabled, advantage, frameData, lastDmg, p1Inputs, p2Inputs }, announcer:{ text, at, now } }
//   { k:"bye" }

const $ = sel => document.querySelector(sel);
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const esc = s => String(s == null ? "" : s);
const pct = (v, m) => m > 0 ? Math.max(0, Math.min(100, (v / m) * 100)) : 0;
const fmtTime = frames => String(Math.max(0, Math.ceil((frames || 0) / 60)));   // roundTimer is frames @60fps → seconds
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

const params = new URLSearchParams(location.search);
let meta = null, lastSnap = null, lastMsgAt = 0;
let transportName = "local";            // "local" (BroadcastChannel) or "LAN"
// selected player: 0 = spectator (all players), 1..4 = focus that slot. URL wins, then localStorage, else 0.
let selected = (() => {
  const p = parseInt(params.get("player"), 10);
  if (p >= 0 && p <= 4) return p;
  try { const s = parseInt(localStorage.getItem("ms_companion_player"), 10); if (s >= 0 && s <= 4) return s; } catch (_) {}
  return 0;
})();

// ── lookups ──
const maxPlayers = () => (meta && meta.maxPlayers) || (lastSnap && lastSnap.mode === "ffa" ? 4 : 2);
const metaPlayer = pn => meta && meta.players && meta.players.find(p => p.pn === pn) || null;
const snapPlayer = pn => lastSnap && lastSnap.players && lastSnap.players.find(p => p.pn === pn) || null;
const otherSnapPlayers = pn => (lastSnap && lastSnap.players ? lastSnap.players.filter(p => p.pn !== pn) : []);

// ── player picker (built from maxPlayers; remembers the choice) ──
function setSelected(pn) {
  selected = pn;
  try { localStorage.setItem("ms_companion_player", String(pn)); } catch (_) {}
  buildPicker(); render();
}
function buildPicker() {
  const nav = $("#players"); if (!nav) return;
  const mk = (pn, label, accent) => {
    const b = el("button", "pbtn" + (selected === pn ? " active" : ""), label);
    if (accent) b.style.setProperty("--pa", accent);
    const mp = pn >= 1 ? metaPlayer(pn) : null;
    if (pn >= 1 && !mp) b.classList.add("empty");          // slot has no fighter in this match
    b.onclick = () => setSelected(pn);
    return b;
  };
  const kids = [mk(0, "◉ SPECTATOR")];
  const mx = Math.min(4, maxPlayers());
  for (let pn = 1; pn <= mx; pn++) {
    const mp = metaPlayer(pn);
    kids.push(mk(pn, `P${pn}${mp ? " · " + shortName(mp.name) : ""}`, mp && mp.accent));
  }
  nav.replaceChildren(...kids);
}
function shortName(n) { n = esc(n); return n.length > 12 ? n.slice(0, 11) + "…" : n; }

// ── unified transport handler (BroadcastChannel OR LAN relay both call this) ──
function onMessage(m) {
  if (!m) return;
  lastMsgAt = now();
  if (m.k === "meta") { meta = m; buildPicker(); render(); }
  else if (m.k === "snap") { lastSnap = m; render(); }
  else if (m.k === "bye") { lastSnap = null; meta = null; buildPicker(); render(); }
}

// ── BroadcastChannel (same-computer) ──
let chan = null;
try { chan = new BroadcastChannel("mv-companion"); chan.onmessage = ev => onMessage(ev.data); } catch (_) {}

// (LAN relay transport for remote devices — phones/iPads over WiFi — is a planned follow-up; the
//  BroadcastChannel path above covers same-computer multi-monitor use today.)

// ── input-notation resolver: kit `input` → concrete keyboard + gamepad labels (device-aware) ──
function resolveInput(input) {
  const B = meta && meta.buttons;
  if (!B || !input) return { kb: input || "—", pad: input || "—" };
  let s = String(input).replace(/\([^)]*\)/g, "").trim().split("/")[0].trim();
  const parts = s.split("+").map(t => t.trim()).filter(Boolean);
  const kb = [], pad = [];
  for (const p of parts) { const key = normToken(p); if (key && B[key]) { kb.push(B[key].kb); pad.push(B[key].pad); } else { kb.push(p); pad.push(p); } }
  return { kb: kb.join(" + ") || "—", pad: pad.join(" + ") || "—" };
}
function normToken(t) {
  const k = t.toLowerCase().replace(/\s+/g, " ").trim();
  if (k === "up-attack" || k === "air" || k === "down-air") return t.replace(/\b\w/g, c => c.toUpperCase());
  const map = { light: "Light", heavy: "Heavy", special: "Special", ultimate: "Ultimate", dash: "Dash", grab: "Grab", charge: "Charge", omnitrix: "Charge",
    up: "Up", jump: "Up", down: "Down", crouch: "Down", block: "Down", forward: "Forward", toward: "Forward", back: "Back", away: "Back" };
  return map[k] || (meta && meta.buttons && meta.buttons[t] ? t : null);
}
const NORMAL_KEY_LABEL = { light: "light attack", heavy: "heavy attack", up: "up-attack", upattack: "up-attack", air: "air attack", down_air: "down-air", downair: "down-air", grab: "grab" };
function moveMatches(live, rowName) {
  const L = String(live || "").toLowerCase().trim(), R = String(rowName || "").toLowerCase().trim();
  if (!L || !R) return false;
  if (L === R) return true;
  if (NORMAL_KEY_LABEL[L] && R.includes(NORMAL_KEY_LABEL[L].split(" ")[0])) return true;
  return R.includes(L) || L.includes(R);
}

// ── master render ──
function render() {
  const live = lastSnap && (now() - lastMsgAt) < 1500;
  const dot = $("#dot"), lt = $("#linktext"), tb = $("#transport");
  dot.className = !lastSnap ? "" : (live ? "live" : "stale");
  if (meta || lastSnap) lt.textContent = live ? "live" : "paused / menu";
  tb.textContent = transportName === "LAN" ? "⇄ LAN" : "⇄ local";
  $("#idle").classList.toggle("hidden", !!(meta || lastSnap));
  for (const id of ["focus", "spectate", "noslot"]) $("#panel-" + id).classList.remove("active");
  if (!meta && !lastSnap) return;

  if (selected === 0) { $("#panel-spectate").classList.add("active"); renderSpectate(); return; }
  const mp = metaPlayer(selected), sp = snapPlayer(selected);
  if (!mp && !sp) { $("#panel-noslot").classList.add("active"); renderNoSlot(); return; }
  $("#panel-focus").classList.add("active"); renderFocus(selected);
}

// ── (A) PLAYER FOCUS — the selected player's data, first + largest ──
function renderFocus(pn) {
  const root = $("#panel-focus");
  const mp = metaPlayer(pn), sp = snapPlayer(pn);
  const accent = (mp && mp.accent) || (sp && sp.accent) || "#4aa8e0";
  const wrap = el("div", "focus"); wrap.style.setProperty("--acc", accent);

  // MAIN column: identity + vitals + move list
  const main = el("div", "focus-main");
  const head = el("div", "focus-head");
  head.appendChild(el("div", "focus-pn", `P${pn}`));
  const id = el("div");
  id.appendChild(el("div", "focus-name", esc((mp && mp.name) || (sp && sp.key) || `Player ${pn}`)));
  id.appendChild(el("div", "focus-sub", `${esc(mp && mp.universe || "")}${mp && mp.type ? " · " + esc(mp.type) : ""}${sp && sp.eliminated ? " · ELIMINATED" : ""}`));
  head.appendChild(id);
  main.appendChild(head);
  main.appendChild(vitals(sp, pn));
  main.appendChild(moveListFor(mp, sp));
  wrap.appendChild(main);

  // SIDE column: the other fighters, smaller + secondary
  const side = el("div", "focus-side");
  side.appendChild(el("div", "side-title", "OTHER FIGHTERS"));
  const others = otherSnapPlayers(pn);
  if (!others.length) side.appendChild(el("div", "muted", "—"));
  else for (const o of others) side.appendChild(miniCard(o));
  wrap.appendChild(side);

  root.replaceChildren(wrap);
}
function vitals(sp, pn) {
  const box = el("div", "vitals");
  if (!sp) { box.appendChild(el("div", "muted", "waiting for live data…")); return box; }
  // HP
  box.appendChild(statBar("Health", `${sp.hp} / ${sp.maxHp}`, pct(sp.hp, sp.maxHp), "hp"));
  // Energy / ULT meter
  const ultLabel = sp.ultReady ? "ULT READY" : `${sp.en} / ${sp.maxEn}`;
  const en = statBar("Ultimate Meter", ultLabel, pct(sp.en, sp.maxEn), "en" + (sp.ultReady ? " ready" : ""));
  box.appendChild(en);
  // chips: combo, dash cd, ult cd, advantage
  const chips = el("div", "vchips");
  chips.appendChild(vchip("Combo", sp.combo || 0, (sp.combo || 0) >= 2 ? "hot" : ""));
  chips.appendChild(vchip("Dash CD", sp.dashCd > 0 ? `${sp.dashCd}f` : "ready", sp.dashCd > 0 ? "warn" : "good"));
  chips.appendChild(vchip("Ult CD", sp.ultCd > 0 ? `${sp.ultCd}f` : (sp.ultReady ? "READY" : "charging"), sp.ultReady ? "good" : (sp.ultCd > 0 ? "warn" : "")));
  const adv = advantageFor(pn);
  if (adv) chips.appendChild(vchip("Frame Adv", `${adv.value >= 0 ? "+" : ""}${adv.value} ${adv.onBlock ? "blk" : "hit"}`, adv.value >= 0 ? "good" : "warn"));
  box.appendChild(chips);
  return box;
}
function advantageFor(pn) {
  const t = lastSnap && lastSnap.training;
  if (!t || !t.enabled || !t.advantage) return null;
  return (t.advantage.who === `P${pn}`) ? t.advantage : null;
}
function statBar(label, valueText, widthPct, cls) {
  const d = el("div", "stat");
  const top = el("div", "stat-top"); top.appendChild(el("span", "stat-label", label)); top.appendChild(el("span", "stat-val", valueText)); d.appendChild(top);
  const bar = el("div", "bar " + cls); const i = el("i"); i.style.width = widthPct + "%"; bar.appendChild(i); d.appendChild(bar);
  return d;
}
function vchip(label, value, cls) { const c = el("div", "vchip " + (cls || "")); c.appendChild(el("span", "vc-l", label)); c.appendChild(el("b", "vc-v", String(value))); return c; }

function moveListFor(mp, sp) {
  const box = el("div", "ml-col focus-moves");
  box.appendChild(el("div", "ml-sec", "Move List — keyboard · gamepad"));
  if (!mp || !mp.kit) { box.appendChild(el("div", "muted", "waiting for roster…")); return box; }
  const kit = mp.kit, live = sp && sp.move;
  const add = (label, rows) => { if (!rows || !rows.length) return; box.appendChild(el("div", "ml-sec", label)); for (const r of rows) box.appendChild(moveRow(r, live)); };
  if (kit.passive && kit.passive.name && kit.passive.name !== "—") add("Passive", [{ name: kit.passive.name, input: "—", desc: kit.passive.effect }]);
  add("Basics", kit.basics || kit.normals);
  add("Specials", kit.specials);
  if (kit.mobility) add("Mobility", [kit.mobility]);
  if (kit.ultimate) add("Ultimate", [kit.ultimate]);
  if (kit.combos && kit.combos.length) {
    box.appendChild(el("div", "ml-sec", "Combos"));
    for (const c of kit.combos) { const row = el("div", "ml-row"); const mv = el("div", "ml-move", esc(c.name)); if (c.desc) mv.appendChild(el("small", null, esc(c.desc))); row.appendChild(mv); const seq = el("div"); seq.style.gridColumn = "2 / span 2"; seq.appendChild(el("span", "chip seq", esc(c.sequence || ""))); row.appendChild(seq); box.appendChild(row); }
  }
  return box;
}
function moveRow(r, liveName) {
  const row = el("div", "ml-row");
  const mv = el("div", "ml-move", esc(r.name));
  if (r.desc) mv.appendChild(el("small", null, esc(r.desc) + (r.cost ? ` · ${r.cost} meter` : "")));
  row.appendChild(mv);
  const { kb, pad } = resolveInput(r.input);
  row.appendChild(chipCell("chip", kb)); row.appendChild(chipCell("chip pad", pad));
  if (liveName && moveMatches(liveName, r.name)) row.classList.add("live");
  return row;
}
function chipCell(cls, text) { const d = el("div"); d.appendChild(el("span", cls, text)); return d; }

function miniCard(o) {
  const c = el("div", "mini"); c.style.setProperty("--acc", o.accent || "#888");
  const top = el("div", "mini-top");
  const nm = (metaPlayer(o.pn) && metaPlayer(o.pn).name) || o.key || `P${o.pn}`;
  top.appendChild(el("span", "mini-name", `P${o.pn} ${shortName(nm)}`));
  if (o.eliminated) top.appendChild(el("span", "mini-elim", "OUT"));
  else if (o.combo >= 2) top.appendChild(el("span", "mini-combo", `${o.combo}x`));
  c.appendChild(top);
  const hp = el("div", "bar hp sm"); const hi = el("i"); hi.style.width = pct(o.hp, o.maxHp) + "%"; hp.appendChild(hi); c.appendChild(hp);
  const en = el("div", "bar en sm"); const ei = el("i"); ei.style.width = pct(o.en, o.maxEn) + "%"; en.appendChild(ei); c.appendChild(en);
  if (o.move) c.appendChild(el("div", "mini-move", esc(o.move)));
  return c;
}

// ── (B) SPECTATOR — all players equal ──
function renderSpectate() {
  const root = $("#panel-spectate");
  if (!lastSnap) { root.replaceChildren(centerNote("Spectator — start a match in the game.")); return; }
  const s = lastSnap, wrap = el("div", "spec");
  const bar = el("div", "spec-bar");
  bar.appendChild(el("div", "clock", fmtTime(s.roundTimer)));
  bar.appendChild(el("div", "round", `${(s.mode || "versus").toUpperCase()} · ROUND ${s.roundNumber || 1}${s.roundWins ? `  ·  ${s.roundWins.p1 || 0} – ${s.roundWins.p2 || 0}` : ""}`));
  wrap.appendChild(bar);
  const grid = el("div", "spec-grid spec-n" + (s.players ? s.players.length : 2));
  for (const p of (s.players || [])) grid.appendChild(specCard(p));
  wrap.appendChild(grid);
  const a = s.announcer, annText = a && a.text && (a.now - a.at) < 2600 ? a.text : "";
  wrap.appendChild(el("div", "ann", annText));
  root.replaceChildren(wrap);
}
function specCard(p) {
  const c = el("div", "spec-card" + (p.eliminated ? " elim" : "")); c.style.setProperty("--acc", p.accent || "#888");
  const nm = (metaPlayer(p.pn) && metaPlayer(p.pn).name) || p.key || `P${p.pn}`;
  const top = el("div", "sc-top");
  top.appendChild(el("span", "sc-name", `P${p.pn} ${esc(nm)}`));
  top.appendChild(el("span", "sc-combo", p.eliminated ? "OUT" : (p.combo >= 2 ? `${p.combo} HIT` : "")));
  c.appendChild(top);
  const hp = el("div", "bar hp"); const hi = el("i"); hi.style.width = pct(p.hp, p.maxHp) + "%"; hp.appendChild(hi); c.appendChild(hp);
  const en = el("div", "bar en"); const ei = el("i"); ei.style.width = pct(p.en, p.maxEn) + "%"; en.appendChild(ei); c.appendChild(en);
  const foot = el("div", "sc-foot");
  foot.appendChild(el("span", "muted", `${p.hp}/${p.maxHp} HP`));
  foot.appendChild(el("span", p.ultReady ? "good" : "muted", p.ultReady ? "ULT READY" : `${Math.round(pct(p.en, p.maxEn))}% ult`));
  c.appendChild(foot);
  if (p.move) c.appendChild(el("div", "sc-move", esc(p.move)));
  return c;
}

// ── (C) empty-slot ──
function renderNoSlot() {
  $("#panel-noslot").replaceChildren(
    (() => { const d = el("div", "noslot"); d.appendChild(el("div", "noslot-big", `No player in slot ${selected}`)); d.appendChild(el("div", "noslot-sub", `This match has ${(meta && meta.players ? meta.players.length : 0)} fighter(s). Pick another slot above, or Spectator for the full match.`)); return d; })()
  );
}

function centerNote(text) { const d = el("div", "muted"); d.style.cssText = "text-align:center;margin-top:16%"; d.textContent = text; return d; }

buildPicker();
render();
setInterval(render, 500);   // keep the live/stale dot + announcer fade honest even without new messages
