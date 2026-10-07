// Multiverse Smash — COMPANION SECOND-SCREEN receiver (opt-in, READ-ONLY).
// Loads in its own window (via index.html?view=companion → companion.html). It imports NO game
// code and holds NO sim. It only LISTENS on BroadcastChannel("mv-companion") and paints DOM.
// There is no path back to the game: this file never posts to the channel and never touches game state.
//
// Channel contract (sender = secondScreen.js / game.js, all pure reads):
//   { k:"meta", mode, padLabel, buttons:{Light:{kb,pad},…}, p1:{key,name,universe,type,kit}, p2:{…} }
//   { k:"snap", frame, roundTimer, roundNumber, roundWins:{p1,p2}, combo,
//               p1:{hp,maxHp,en,maxEn,move,combo}, p2:{…},
//               training:{enabled,advantage,frameData,lastDmg,p1Inputs,p2Inputs},
//               announcer:{text,at,now} }
//   { k:"bye" }                                        // game toggled the feature OFF / closing

const $ = sel => document.querySelector(sel);
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const esc = s => String(s == null ? "" : s);
const pct = (v, m) => m > 0 ? Math.max(0, Math.min(100, (v / m) * 100)) : 0;
const fmtTime = frames => String(Math.max(0, Math.ceil((frames || 0) / 60)));   // roundTimer is frames @60fps → seconds

let meta = null;        // last meta (roster kits + control maps)
let lastSnap = null;    // last snapshot
let lastMsgAt = 0;      // perf.now of the last received message (for the live/stale dot)
let panel = "spectator"; // active tab

// ── Tab switching (driven from this window only) ──
document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => setPanel(b.dataset.panel)));
function setPanel(p) {
  panel = p;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.panel === p));
  document.querySelectorAll(".panel").forEach(n => n.classList.toggle("active", n.id === `panel-${p}`));
  render();   // repaint the newly-shown panel immediately
  try { localStorage.setItem("ms_companion_panel", p); } catch (_) {}
}

// ── Receive-only channel ──
let chan = null;
try {
  chan = new BroadcastChannel("mv-companion");
  chan.onmessage = ev => {
    const m = ev.data || {};
    lastMsgAt = now();
    if (m.k === "meta") { meta = m; render(); }
    else if (m.k === "snap") { lastSnap = m; render(); }
    else if (m.k === "bye") { lastSnap = null; meta = null; render(); }
  };
} catch (_) { /* BroadcastChannel unsupported → stays on the idle screen */ }

function now() { return (typeof performance !== "undefined" ? performance.now() : Date.now()); }

// ── Input-notation resolver: kit `input` string → concrete keyboard + gamepad labels ──
// Strips parentheticals, takes the first "/" alternative, splits on "+", maps each token via the
// device-aware `buttons` map the game sent (padGlyphs reflect the ACTUAL connected controller).
function resolveInput(input) {
  const B = meta && meta.buttons;
  if (!B || !input) return { kb: input || "—", pad: input || "—" };
  let s = String(input).replace(/\([^)]*\)/g, "").trim().split("/")[0].trim();
  const parts = s.split("+").map(t => t.trim()).filter(Boolean);
  const kb = [], pad = [];
  for (const p of parts) {
    const key = normToken(p);
    if (key && B[key]) { kb.push(B[key].kb); pad.push(B[key].pad); }
    else { kb.push(p); pad.push(p); }
  }
  return { kb: kb.join(" + ") || "—", pad: pad.join(" + ") || "—" };
}
function normToken(t) {
  const k = t.toLowerCase().replace(/\s+/g, " ").trim();
  if (k === "up-attack" || k === "air" || k === "down-air") return t.replace(/\b\w/g, c => c.toUpperCase());
  const map = {
    light: "Light", heavy: "Heavy", special: "Special", ultimate: "Ultimate", dash: "Dash",
    grab: "Grab", charge: "Charge", omnitrix: "Charge",
    up: "Up", jump: "Up", down: "Down", crouch: "Down", block: "Down",
    forward: "Forward", toward: "Forward", back: "Back", away: "Back"
  };
  return map[k] || (meta && meta.buttons && meta.buttons[t] ? t : null);
}

// ── Master render: paints only the active panel + the status chrome ──
function render() {
  const live = lastSnap && (now() - lastMsgAt) < 1500;
  const dot = $("#dot"), lt = $("#linktext");
  dot.className = !lastSnap ? "" : (live ? "live" : "stale");
  lt.textContent = !meta && !lastSnap ? "waiting…" : (live ? "live" : "paused / menu");
  $("#idle").classList.toggle("hidden", !!(meta || lastSnap));

  if (panel === "movelist") renderMoveList();
  else if (panel === "training") renderTraining();
  else renderSpectator();
}

// ── (a) LIVE MOVE LIST ──
function renderMoveList() {
  const root = $("#panel-movelist");
  if (!meta) { root.innerHTML = ""; return; }
  const wrap = el("div", "ml-wrap");
  wrap.appendChild(fighterColumn(meta.p1, lastSnap && lastSnap.p1, "col1", 1));
  wrap.appendChild(fighterColumn(meta.p2, lastSnap && lastSnap.p2, "col2", 2));
  root.replaceChildren(wrap);
}
function fighterColumn(fm, fs, accentCls, side) {
  const col = el("div", "ml-col");
  const head = el("div", "ml-head");
  head.appendChild(el("div", "ml-name " + accentCls, esc(fm.name)));
  head.appendChild(el("div", "ml-sub", `${esc(fm.universe || "")}${fm.type ? " · " + esc(fm.type) : ""}`));
  col.appendChild(head);
  const kit = fm.kit || {};
  const liveName = fs && fs.move;                         // currently-performing move (string)
  const addSection = (label, rows) => {
    if (!rows || !rows.length) return;
    col.appendChild(el("div", "ml-sec", label));
    for (const r of rows) col.appendChild(moveRow(r, liveName));
  };
  if (kit.passive && kit.passive.name && kit.passive.name !== "—")
    addSection("Passive", [{ name: kit.passive.name, input: "—", desc: kit.passive.effect }]);
  addSection("Basics", kit.basics || kit.normals);
  addSection("Specials", kit.specials);
  if (kit.mobility) addSection("Mobility", [kit.mobility]);
  if (kit.ultimate) addSection("Ultimate", [kit.ultimate]);
  if (kit.combos && kit.combos.length) {
    col.appendChild(el("div", "ml-sec", "Combos"));
    for (const c of kit.combos) {
      const row = el("div", "ml-row");
      const mv = el("div", "ml-move", esc(c.name)); if (c.desc) mv.appendChild(el("small", null, esc(c.desc)));
      row.appendChild(mv);
      const seq = el("div"); seq.style.gridColumn = "2 / span 2"; seq.appendChild(el("span", "chip seq", esc(c.sequence || "")));
      row.appendChild(seq);
      col.appendChild(row);
    }
  }
  return col;
}
function moveRow(r, liveName) {
  const row = el("div", "ml-row");
  const mv = el("div", "ml-move", esc(r.name));
  if (r.desc) mv.appendChild(el("small", null, esc(r.desc) + (r.cost ? ` · ${r.cost} meter` : "")));
  row.appendChild(mv);
  const { kb, pad } = resolveInput(r.input);
  row.appendChild(withChip("chip", kb));
  row.appendChild(withChip("chip pad", pad));
  if (liveName && moveMatches(liveName, r.name)) row.classList.add("live");
  return row;
}
function withChip(cls, text) { const d = el("div"); d.appendChild(el("span", cls, text)); return d; }

// Match a live move name/key against a kit move row. Specials/ults carry the display name directly;
// normals come through as lowercase keys (light/heavy/up/air/down_air) → map to the basics labels.
const NORMAL_KEY_LABEL = {
  light: "light attack", heavy: "heavy attack", up: "up-attack", upattack: "up-attack",
  air: "air attack", down_air: "down-air", downair: "down-air", grab: "grab"
};
function moveMatches(live, rowName) {
  const L = String(live).toLowerCase().trim(), R = String(rowName).toLowerCase().trim();
  if (!L || !R) return false;
  if (L === R) return true;
  if (NORMAL_KEY_LABEL[L] && R.includes(NORMAL_KEY_LABEL[L].split(" ")[0])) return true;
  return R.includes(L) || L.includes(R);
}

// ── (b) TRAINING DASHBOARD ──
function renderTraining() {
  const root = $("#panel-training");
  const t = lastSnap && lastSnap.training;
  if (!t) { root.replaceChildren(centerNote("Enter Training mode in the game to see frame data, input history and combo damage.")); return; }
  const grid = el("div", "tr-grid");

  // Frame data
  const fd = t.frameData, cFrame = el("div", "card");
  cFrame.appendChild(el("h3", null, "Frame Data"));
  if (fd && !fd.cast) {
    kv(cFrame, "Move", `${fd.who} · ${fd.name}`);
    kv(cFrame, "Startup", fd.startup); kv(cFrame, "Active", fd.active); kv(cFrame, "Recovery", fd.recovery);
    kv(cFrame, "Phase", fd.phase); kv(cFrame, "Elapsed", `${fd.elapsed}/${fd.total}`);
  } else if (fd && fd.cast) { kv(cFrame, "Move", `${fd.who} · ${fd.name}`); kv(cFrame, "Phase", "cast (special/ultimate)"); }
  else cFrame.appendChild(el("div", "muted", "No move active."));
  grid.appendChild(cFrame);

  // Advantage + last damage
  const cAdv = el("div", "card");
  cAdv.appendChild(el("h3", null, "Advantage · Last Hit"));
  const adv = t.advantage;
  if (adv) {
    const row = el("div", "kv"); row.appendChild(el("span", null, `Frame adv (${adv.who} ${esc(adv.move || "")})`));
    const b = el("b", (adv.value >= 0 ? "adv-pos" : "adv-neg"), `${adv.value >= 0 ? "+" : ""}${adv.value} ${adv.onBlock ? "on block" : "on hit"}`);
    row.appendChild(b); cAdv.appendChild(row);
    kv(cAdv, "Stun", adv.stun); kv(cAdv, "Recovery", adv.recovery);
  } else cAdv.appendChild(el("div", "muted", "No interaction captured yet."));
  cAdv.appendChild(el("h3", null, "Last Combo Damage"));
  cAdv.appendChild(el("div", "big-dmg", String(Math.round(t.lastDmg || 0))));
  grid.appendChild(cAdv);

  // Input history P1 / P2
  const cIn = el("div", "card"); cIn.appendChild(el("h3", null, "Input History"));
  inputBlock(cIn, "P1", t.p1Inputs); inputBlock(cIn, "P2", t.p2Inputs);
  grid.appendChild(cIn);

  // Combo meters
  const cCombo = el("div", "card"); cCombo.appendChild(el("h3", null, "Combo"));
  kv(cCombo, "Current (max)", lastSnap.combo || 0);
  kv(cCombo, "P1 combo", (lastSnap.p1 && lastSnap.p1.combo) || 0);
  kv(cCombo, "P2 combo", (lastSnap.p2 && lastSnap.p2.combo) || 0);
  grid.appendChild(cCombo);

  root.replaceChildren(grid);
}
function inputBlock(card, who, arr) {
  const lab = el("div", "muted", who); lab.style.marginTop = "8px"; card.appendChild(lab);
  const box = el("div", "inp-hist");
  const items = Array.isArray(arr) ? arr.slice(-16) : [];
  if (!items.length) box.appendChild(el("span", null, "—"));
  else for (const it of items) box.appendChild(el("span", null, typeof it === "string" ? it : (it && (it.label || it.dir || it.key)) || "·"));
  card.appendChild(box);
}

// ── (c) SPECTATOR ──
function renderSpectator() {
  const root = $("#panel-spectator");
  if (!lastSnap) { root.replaceChildren(centerNote("Spectator view — start a match in the game.")); return; }
  const s = lastSnap;
  const p1n = (meta && meta.p1 && meta.p1.name) || (s.p1 && s.p1.key) || "P1";
  const p2n = (meta && meta.p2 && meta.p2.name) || (s.p2 && s.p2.key) || "P2";
  const spec = el("div", "spec");

  const top = el("div", "spec-top");
  top.appendChild(hpCard(p1n, s.p1, false));
  const mid = el("div");
  mid.appendChild(el("div", "clock", fmtTime(s.roundTimer)));
  mid.appendChild(el("div", "round", `ROUND ${s.roundNumber || 1}  ·  ${(s.roundWins && s.roundWins.p1) || 0} – ${(s.roundWins && s.roundWins.p2) || 0}`));
  top.appendChild(mid);
  top.appendChild(hpCard(p2n, s.p2, true));
  spec.appendChild(top);

  const comboWrap = el("div", "combo-wrap");
  const c = s.combo || 0;
  const cb = el("div", "combo-big" + (c >= 2 ? " on" : ""), c >= 2 ? `${c} HIT` : "—");
  comboWrap.appendChild(cb);
  spec.appendChild(comboWrap);

  const a = s.announcer;
  const annText = a && a.text && (a.now - a.at) < 2600 ? a.text : "";
  spec.appendChild(el("div", "ann", annText));

  root.replaceChildren(spec);
}
function hpCard(name, f, right) {
  const card = el("div", "hpcard" + (right ? " right" : ""));
  card.appendChild(el("div", "hp-name", esc(name)));
  card.appendChild(el("div", "hp-key", f ? esc(f.key || "") : ""));
  const hp = el("div", "bar hp"); const hi = el("i"); hi.style.width = pct(f && f.hp, f && f.maxHp) + "%"; hp.appendChild(hi); card.appendChild(hp);
  const en = el("div", "bar en"); const ei = el("i"); ei.style.width = pct(f && f.en, f && f.maxEn) + "%"; en.appendChild(ei); card.appendChild(en);
  return card;
}

// ── helpers ──
function kv(card, k, v) { const r = el("div", "kv"); r.appendChild(el("span", null, k)); r.appendChild(el("b", null, String(v == null ? "—" : v))); card.appendChild(r); }
function centerNote(text) { const d = el("div", "muted"); d.style.cssText = "text-align:center;margin-top:18%"; d.textContent = text; return d; }

// restore last-used panel; mark stale if no message arrives
try { const p = localStorage.getItem("ms_companion_panel"); if (p) panel = p; } catch (_) {}
setPanel(panel);
setInterval(render, 500);   // keep the live/stale dot + announcer fade honest even without new messages
