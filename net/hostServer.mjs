// net/hostServer.mjs — MSV1-HOST: the PUBLIC host server (node only; no Electron imports, so it is testable
// headless). One HTTP listener carries everything a remote friend may touch, and NOTHING else:
//
//   GET /                → the game's index.html (live import map, exactly like the desktop app serves it)
//   GET /<client file>   → only files in the client MANIFEST (exact-path whitelist; no listing, no traversal)
//   GET /join?room=CODE  → small join page: "Play in browser" / "Open in desktop app"
//   GET /api/room/CODE   → room lookup JSON (counts as a join attempt → rate-limited)
//   GET /healthz         → { ok, id } (used to verify a UPnP route really reaches THIS server)
//   WS  /ws?room=CODE    → the lockstep relay, per room (same protocol.js messages as the LAN relay)
//
// The desktop app's own dev server (save/feedback/lan-info APIs) is a DIFFERENT listener bound to 127.0.0.1
// and is never reachable through this one. No request ever runs client data: messages are parsed as JSON,
// shape-checked, rebuilt field by field and only then forwarded, and only inside the sender's own room.
//
// The relay is the existing LAN relay's model (protocol.js HELLO→WELCOME/REJECT, seats p1/p2, LOBBY presence,
// INPUT/MATCH_SETUP/BYE forwarding) with rooms, limits and validation added for internet exposure.

import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import zlib from "node:zlib"
import { WebSocketServer } from "ws"
import {
  decode, encode, checkHello, makeWelcome, makeReject, makeLobby, makeMatchSetup, makePick, MSG,
} from "./protocol.js"
import {
  ROOM_ALPHABET, ROOM_CODE_LEN, MAX_PLAYERS_PER_ROOM, normalizeRoomCode, RELEASES_URL, PROTOCOL_SCHEME,
} from "./hostConfig.js"

export const DEFAULT_HOST_PORT = 8790

export const DEFAULT_LIMITS = Object.freeze({
  maxRooms: 4,                 // total rooms on this host
  maxConnections: 24,          // total open WebSockets
  maxConnectionsPerIp: 4,
  maxPayload: 2048,            // bytes per WS message (an INPUT is ~50 bytes, a MATCH_SETUP ~400)
  msgsPerSecond: 150,          // per client; lockstep sends ~60 INPUT/s
  helloTimeoutMs: 5000,
  badMessagesBeforeDrop: 20,
  joinFailuresPerWindow: 8,    // unknown-room attempts per IP …
  joinWindowMs: 10 * 60_000,   // … per 10 minutes …
  joinBlockMs: 10 * 60_000,    // … then that IP is refused for 10 minutes
  httpPerWindow: 4000,         // generous: a fresh game load fetches many assets
  httpWindowMs: 10_000,
  heartbeatMs: 2000,
  deadAfterMs: 10_000,
})

export function makeRoomCode(randomInt = crypto.randomInt) {
  let s = ""
  for (let i = 0; i < ROOM_CODE_LEN; i++) s += ROOM_ALPHABET[randomInt(ROOM_ALPHABET.length)]
  return s
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".wav": "audio/wav",
  ".mp4": "video/mp4", ".json": "application/json", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
}

const isLoopback = (a) => a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1"
const stripV6 = (a) => String(a || "").replace(/^::ffff:/, "")

// Requests relayed by cloudflared arrive from loopback with Cloudflare's headers. Those are PUBLIC clients.
function isForwarded(req) {
  return !!(req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.headers["cf-ray"])
}
function clientIp(req) {
  const ra = stripV6(req.socket.remoteAddress)
  if (isLoopback(ra) && isForwarded(req)) {
    const v = String(req.headers["cf-connecting-ip"] || String(req.headers["x-forwarded-for"] || "").split(",")[0]).trim()
    return v ? `fwd:${v}` : "fwd:unknown"
  }
  return ra
}

// A request path → a safe manifest key, or null. Refuses every traversal trick BEFORE decoding (encoded dots
// and slashes, backslashes, NUL) and again after, then requires the normalised form to equal the input.
export function safeRelPath(rawUrl) {
  const raw = String(rawUrl || "").split("?")[0].split("#")[0]
  if (!raw.startsWith("/")) return null
  if (/%2e|%2f|%5c|%00|\\|\0/i.test(raw)) return null
  let dec
  try { dec = decodeURIComponent(raw) } catch { return null }
  if (dec.includes("\0") || dec.includes("\\")) return null
  const rel = dec.replace(/^\/+/, "")
  if (!rel) return "index.html"
  if (rel.split("/").some((seg) => seg === ".." || seg === "." || seg === "")) return null
  if (path.posix.normalize(rel) !== rel || path.isAbsolute(rel) || /^[a-z]:/i.test(rel)) return null
  return rel
}

function securityHeaders(extra = {}) {
  return {
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "cross-origin-resource-policy": "same-origin",
    ...extra,
  }
}

// ── compression ─────────────────────────────────────────────────────────────────────────────────────────
// A friend's first load is ~18 MB of JavaScript, and over the internet link every byte goes out through the
// HOST's home upload. Text compresses ~5-8×, so code / html / css / json are sent brotli (or gzip) encoded.
// Compressed bodies are cached per file (keyed by size + mtime) and built asynchronously (zlib thread pool), so
// serving a friend never stalls the host's own game. Images / audio are already compressed → sent as-is.
const COMPRESSIBLE = new Set([".js", ".mjs", ".html", ".css", ".json", ".txt", ".svg", ".map"])
export function pickEncoding(acceptEncoding) {
  const a = String(acceptEncoding || "").toLowerCase()
  if (/\bbr\b/.test(a)) return "br"
  if (/\bgzip\b/.test(a)) return "gzip"
  return null
}
function compressBuf(buf, enc) {
  return new Promise((resolve, reject) => {
    const done = (e, out) => (e ? reject(e) : resolve(out))
    if (enc === "br") zlib.brotliCompress(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }, done)
    else zlib.gzip(buf, { level: 6 }, done)
  })
}

// A friend opening the game from a link (/?room=CODE): the browser shows nothing until every game module has
// arrived (on a phone over the internet that can take a while), so the page itself carries a loading screen from
// its first bytes, with a live file count. net/hostLink.js removes it once its join screen takes over.
// Static text only — no request data is echoed into the page.
export const JOIN_SPLASH = `<div id="ms-join-splash" style="position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 30%,#10284f,#030914);color:#e8f1ff;font:16px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;text-align:center;padding:16px">
<div style="max-width:440px"><div style="font:800 24px system-ui;margin-bottom:8px">Joining your friend's game…</div>
<div id="ms-join-splash-n" style="color:#ffd27a">Loading the game</div>
<div style="margin:14px auto 0;width:260px;height:8px;border-radius:4px;background:#183156;overflow:hidden"><div id="ms-join-splash-bar" style="height:100%;width:3%;background:#4ad5ff;transition:width .3s"></div></div>
<p style="color:#9fb3d1;font-size:13px;margin-top:14px">The first time can take a minute on mobile data. Keep this page open.</p></div></div>
<script>(function(){var n=0,want=820,t=document.getElementById('ms-join-splash-n'),b=document.getElementById('ms-join-splash-bar');
try{new PerformanceObserver(function(l){n+=l.getEntries().length;var p=Math.min(97,Math.round(n/want*100));if(t)t.textContent='Loading the game — '+p+'%';if(b)b.style.width=p+'%'}).observe({type:'resource',buffered:true})}catch(e){}})()</script>`
const SEATS = ["p1", "p2", "p3", "p4"]   // p1 = the host; friends take p2, p3, p4 in order

export function withJoinSplash(html) { return html.replace(/<body[^>]*>/i, (m) => m + JOIN_SPLASH) }

// ── ONE-FILE CODE PACK for a friend on the internet link ─────────────────────────────────────────────────
// The game is ~640 separate code modules. Over a Cloudflare quick tunnel every request is a round trip to the
// host's home connection, and the game fires hundreds at once — the likely reason a friend's load froze part-way
// (reported at ~67 %; quick tunnels limit requests in flight). So a friend on https gets
// a tiny service worker that downloads EVERY module in ONE request (/__pack.json, brotli) and answers the
// module requests from it. Same bytes, same URLs (importmap ?v=…), so the game code is identical. LAN (plain http)
// has no service workers — it loads as before (and is fast). Any failure → normal loading.
export const FRIEND_SW = `// Multiverse Smash — friend loader (one-request code pack). Generated by net/hostServer.mjs.
const V = new URL(self.location).searchParams.get('v') || ''
const CACHE = 'ms-pack-' + V
async function fill() {
  const c = await caches.open(CACHE)
  if (await c.match('/__ms_pack_ok?v=' + V)) return
  const r = await fetch('/__pack.json?v=' + encodeURIComponent(V), { cache: 'no-store' })
  if (!r.ok) throw new Error('pack ' + r.status)
  const total = +r.headers.get('x-ms-raw-length') || 0, reader = r.body.getReader(), parts = []
  let got = 0, lastSent = 0
  for (;;) {
    const { done, value } = await reader.read(); if (done) break
    parts.push(value); got += value.length
    if (total && got - lastSent > 200000) { lastSent = got; const cs = await self.clients.matchAll({ includeUncontrolled: true }); for (const cl of cs) cl.postMessage({ msPack: Math.min(99, Math.round(got / total * 100)) }) }
  }
  const j = JSON.parse(await new Blob(parts).text())
  await Promise.all(Object.entries(j.files).map(([p, src]) => c.put(new Request(p + '?v=' + V), new Response(src, { headers: { 'content-type': 'text/javascript; charset=utf-8' } }))))
  await c.put(new Request('/__ms_pack_ok?v=' + V), new Response('1'))
}
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(fill()) })
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('ms-pack-') && k !== CACHE) await caches.delete(k)
  await self.clients.claim()
})()))
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url)
  if (e.request.method !== 'GET' || u.origin !== self.location.origin || !u.pathname.endsWith('.js')) return
  e.respondWith(caches.open(CACHE).then((c) => c.match(e.request)).then((hit) => hit || fetch(e.request)))
})
`
// The friend page: the game's entry <script type="module"> is started only once the pack is in place (or at once
// if service workers aren't available / fail / take too long). Static text only.
export function withFriendLoader(html) {
  const m = /<script type="module" src="([^"]+)"><\/script>/.exec(html)
  const v = /window\.__ASSET_V=("[^"]*")/.exec(html)
  if (!m || !v) return html
  const entry = JSON.stringify(m[1]), ver = v[1]
  const loader = `<script>(function(){var started=false,t=document.getElementById('ms-join-splash-n'),b=document.getElementById('ms-join-splash-bar');
function go(){if(started)return;started=true;var s=document.createElement('script');s.type='module';s.src=${entry};document.body.appendChild(s)}
if(!('serviceWorker' in navigator)||!window.isSecureContext){go();return}
navigator.serviceWorker.addEventListener('message',function(e){var p=e.data&&e.data.msPack;if(p!=null&&!started){if(t)t.textContent='Downloading the game — '+p+'%';if(b)b.style.width=Math.max(3,Math.round(p*0.9))+'%'}});
var cur=navigator.serviceWorker.controller;if(cur&&cur.scriptURL.indexOf('v='+encodeURIComponent(${ver}))>=0){go();return}
navigator.serviceWorker.addEventListener('controllerchange',go);
navigator.serviceWorker.register('/ms-friend-sw.js?v='+encodeURIComponent(${ver}),{scope:'/'}).then(function(reg){var w=reg.installing||reg.waiting;if(w)w.addEventListener('statechange',function(){if(w.state==='redundant')go()})},go);
setTimeout(go,180000)})()</script>`
  return html.replace(m[0], loader)
}
// Every module the page's importmap names → { "/path.js": source }
export function packModules(html, root, manifest) {
  const im = /<script type="importmap">([\s\S]*?)<\/script>/.exec(html)
  if (!im) return null
  let map; try { map = JSON.parse(im[1]).imports || {} } catch { return null }
  const files = {}
  for (const val of Object.values(map)) {
    const rel = String(val).replace(/^\.?\//, "").split("?")[0]
    if (!manifest.has(rel)) continue
    try { files["/" + rel] = fs.readFileSync(path.join(root, rel), "utf8") } catch {}
  }
  return files
}

function joinPageHtml(room, nonce) {
  // Static template; the ONLY dynamic value is a validated room code (alphabet-checked), so nothing a
  // visitor sends is ever echoed into the page.
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Multiverse Smash — play with a friend</title>
<style>
:root{--bg:#061225;--card:#0d1f3c;--fg:#e8f1ff;--mut:#9fb3d1;--acc:#4ad5ff;--bad:#ff6b6b}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--fg);font:16px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;padding:16px}
.card{max-width:440px;width:100%;background:var(--card);border:1px solid #1d3a66;border-radius:14px;padding:24px}
h1{font-size:20px;margin:0 0 4px}.code{font:700 28px ui-monospace,Menlo,monospace;letter-spacing:4px;color:var(--acc)}
p{color:var(--mut);margin:8px 0}.link{font:600 15px ui-monospace,Menlo,monospace;word-break:break-all;background:#061225;border:1px solid #2a4a7a;border-radius:8px;padding:10px;color:var(--fg);user-select:all}[hidden]{display:none!important}a.btn,button{display:block;width:100%;text-align:center;margin-top:12px;padding:12px;border-radius:10px;border:0;font:600 16px system-ui;cursor:pointer;text-decoration:none}
.pri{background:var(--acc);color:#04203a}.sec{background:#183156;color:var(--fg)}.st{min-height:1.5em}.bad{color:var(--bad)}small{color:var(--mut)}
</style></head><body><main class="card" id="join">
<h1>Your friend invited you to Multiverse Smash</h1>
<div class="code" id="code">${room || "------"}</div>
<p class="st" id="st">${room ? "Checking the room…" : "This link has no valid room code."}</p>
<a class="btn pri" id="play" href="${room ? `/?room=${room}` : "/"}">JOIN THE GAME</a>
<p><small>Plays right here in your browser — no download. You'll pick your own fighter.</small></p>
</main>
<main class="card" id="invite" hidden>
<h1>Your invite link is ready</h1>
<p id="who">Copy this link and send it to your friend — or let them scan the code with a phone camera.</p>
<div class="link" id="lnk"></div>
<div id="qr" style="display:flex;justify-content:center;margin:12px 0"></div>
<button class="pri" id="copy" type="button">Copy link</button>
<p class="st" id="ist">Waiting for your friend to open it… Keep the game open — you'll both pick your fighters there.</p>
</main>
<script nonce="${nonce}">
(function(){var room=${JSON.stringify(room || "")};var st=document.getElementById('st');
var link=location.origin+'/join?room='+room;
if(room&&location.hash==='#invite'){
 // The HOST opened this from the game: show a copy-and-send page and drop "#invite" from the address bar,
 // so copying the address bar gives the friend the plain join link.
 try{history.replaceState(null,'',link)}catch(e){}
 document.getElementById('join').hidden=true;document.getElementById('invite').hidden=false;
 document.getElementById('lnk').textContent=link;
 document.getElementById('who').textContent=location.protocol==='https:'?'Copy this link and send it to your friend — it works from anywhere — or let them scan the code with a phone camera.':'Copy this link and send it to your friend — they need to be on the same Wi-Fi as you — or let them scan the code with a phone camera.';
 var cb=document.getElementById('copy');
 cb.onclick=function(){var done=function(){cb.textContent='Copied ✓ — now paste it to your friend';setTimeout(function(){cb.textContent='Copy link'},2500)};
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(link).then(done,fallback)}else fallback();
  function fallback(){var r=document.createRange();r.selectNodeContents(document.getElementById('lnk'));var s=getSelection();s.removeAllRanges();s.addRange(r);try{document.execCommand('copy');done()}catch(e){cb.textContent='Select the link above and copy it'}}};
 var ist=document.getElementById('ist');
 setInterval(function(){fetch('/api/room/'+room,{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){
  if(!j.ok){ist.textContent='This room has closed. Click PLAY WITH A FRIEND in the game for a new link.';ist.className='st bad';return}
  ist.textContent=j.players>=2?'Your friend is in! Go back to the game window to pick your fighter.':'Waiting for your friend to open it… Keep the game open — you will both pick your fighters there.';
 }).catch(function(){})},2000);
 return;
}
if(!room)return;
fetch('/api/room/'+room,{cache:'no-store'}).then(function(r){return r.json().then(function(j){return{s:r.status,j:j}})}).then(function(x){
 if(x.s===429){st.textContent='Too many attempts from your network. Try again in a few minutes.';st.className='st bad';return}
 if(!x.j.ok){st.textContent='This room does not exist or has closed. Ask your friend for a new link.';st.className='st bad';return}
 st.textContent=x.j.full?'This room is full (2 players).':'Room is open — '+x.j.players+' of '+x.j.max+' players connected.';
}).catch(function(){st.textContent='Could not reach the host.';st.className='st bad'});
})();
</script>
<script type="module" nonce="${nonce}">
if(location.hash==='#invite'||document.getElementById('invite').hidden===false){
 import('/net/qrcode.js').then(function(m){var c=document.createElement('canvas');m.drawQr(c,location.origin+'/join?room='+${JSON.stringify(room || "")},{scale:6,margin:4});
  c.style.cssText='width:200px;height:200px;image-rendering:pixelated;border-radius:8px';c.setAttribute('aria-label','QR code of the invite link');document.getElementById('qr').append(c)}).catch(function(){})
}
</script></body></html>`
}

// options:
//   root          — directory the manifest paths are relative to
//   manifest      — Set<string> of allowed relative posix paths (client files only)
//   renderIndex   — () => string  : index.html with the live import map (caller supplies; same as the app)
//   buildInfo     — { appVersion, codeHash } : this host's build; joiners must match codeHash exactly
//   releasesUrl   — shown to mismatched desktop joiners
//   limits        — overrides for DEFAULT_LIMITS
//   log           — (msg) => void
//   isAllowedOrigin — optional extra origin predicate
//   legacyLanRoom — optional () => code : room that a direct-LAN ws://ip:port/ (no room) connection joins
export function createHostServer(opts = {}) {
  const root = path.resolve(opts.root || ".")
  const manifest = opts.manifest || new Set()
  const L = { ...DEFAULT_LIMITS, ...(opts.limits || {}) }
  const log = opts.log || (() => {})
  const buildInfo = { appVersion: null, codeHash: null, ...(opts.buildInfo || {}) }
  const releasesUrl = opts.releasesUrl || RELEASES_URL
  const instanceId = crypto.randomBytes(12).toString("hex")
  let realRoot = root
  try { realRoot = fs.realpathSync(root) } catch {}

  const rooms = new Map()            // code → room
  const conns = new Set()            // every open ws
  const perIpConns = new Map()       // ip → count
  const joinFails = new Map()        // ip → { times: number[], blockedUntil }
  const httpHits = new Map()         // ip → { start, n }
  let publicOrigins = new Set()      // e.g. https://abc.trycloudflare.com (set by host.js)
  let listenPort = null
  let changeCb = () => {}

  const now = () => Date.now()
  const emitChange = () => { try { changeCb(snapshot()) } catch {} }

  // ── rate limiting ─────────────────────────────────────────────────────────
  function joinBlocked(ip) {
    const r = joinFails.get(ip)
    return !!(r && r.blockedUntil && r.blockedUntil > now())
  }
  function noteJoinFailure(ip) {
    const t = now()
    const r = joinFails.get(ip) || { times: [], blockedUntil: 0 }
    r.times = r.times.filter((x) => t - x < L.joinWindowMs)
    r.times.push(t)
    if (r.times.length >= L.joinFailuresPerWindow) { r.blockedUntil = t + L.joinBlockMs; log(`[host] join attempts from ${ip} blocked for ${L.joinBlockMs / 1000}s`) }
    joinFails.set(ip, r)
  }
  function httpAllowed(ip) {
    const t = now()
    const r = httpHits.get(ip)
    if (!r || t - r.start > L.httpWindowMs) { httpHits.set(ip, { start: t, n: 1 }); return true }
    r.n++
    return r.n <= L.httpPerWindow
  }

  // ── origin check (browser WebSockets always send Origin; non-browser clients may omit it) ───────────
  function originAllowed(req) {
    const o = req.headers.origin
    if (!o) return true
    let u
    try { u = new URL(o) } catch { return false }
    if (publicOrigins.has(u.origin)) return true
    if (opts.isAllowedOrigin && opts.isAllowedOrigin(u.origin)) return true
    const host = u.hostname
    // a desktop app (ours or a friend's) runs the game from its own loopback server on a random port
    if ((host === "127.0.0.1" || host === "localhost") && u.protocol === "http:") return true
    // the host's own LAN origin (http://<lan-ip>:<this port>)
    if (u.protocol === "http:" && String(listenPort) === (u.port || "80") && isPrivateIp(host)) return true
    return false
  }

  // ── rooms ───────────────────────────────────────────────────────────────────
  function createRoom() {
    if (rooms.size >= L.maxRooms) throw new Error(`room limit reached (${L.maxRooms})`)
    let code
    do { code = makeRoomCode() } while (rooms.has(code))
    const room = { code, hostToken: crypto.randomBytes(24).toString("base64url"), seats: { p1: null, p2: null, p3: null, p4: null }, created: now() }
    rooms.set(code, room)
    log(`[host] room ${code} opened`)
    emitChange()
    return { code, hostToken: room.hostToken }
  }
  function closeRoom(code, reason = "The host closed the room.") {
    const room = rooms.get(code)
    if (!room) return false
    rooms.delete(code)
    for (const s of SEATS.map((k) => room.seats[k])) {
      if (s && s.readyState === 1) { try { s.send(encode({ t: MSG.BYE, reason })) } catch {} ; try { s.close(4100, "room closed") } catch {} }
    }
    for (const ws of conns) if (ws._room === room && ws.readyState === 1) { try { ws.close(4100, "room closed") } catch {} }
    log(`[host] room ${code} closed`)
    emitChange()
    return true
  }
  const occupied = (room) => SEATS.filter((s) => room.seats[s])
  function broadcastLobby(room) {
    const m = encode(makeLobby(occupied(room)))
    for (const s of SEATS.map((k) => room.seats[k])) if (s && s.readyState === 1) s.send(m)
  }

  function snapshot() {
    return {
      port: listenPort,
      rooms: [...rooms.values()].map((r) => ({
        code: r.code,
        players: SEATS.filter((s) => r.seats[s]).map((s) => ({
          side: s, name: r.seats[s]._name || null, host: !!r.seats[s]._isHost, pingMs: r.seats[s]._rtt ?? null,
        })),
      })),
      connections: conns.size,
    }
  }

  let packCache = null   // { ver, raw: Buffer, z: Map(enc → Promise<Buffer>) }
  function packFor(html) {
    const ver = (/window\.__ASSET_V=("[^"]*")/.exec(html) || [])[1]
    if (!ver) return null
    if (packCache && packCache.ver === ver) return packCache
    const files = packModules(html, root, manifest)
    if (!files) return null
    packCache = { ver, raw: Buffer.from(JSON.stringify({ v: JSON.parse(ver), files }), "utf8"), z: new Map() }
    return packCache
  }
  const renderPageHtml = () => (opts.renderIndex ? opts.renderIndex() : fs.readFileSync(path.join(root, "index.html"), "utf8"))
  const zcache = new Map()   // `${enc}|${realPath}` → { key: "size:mtime", body: Promise<Buffer> }
  function compressedFile(real, st, enc) {
    const id = `${enc}|${real}`, key = `${st.size}:${st.mtimeMs}`
    const hit = zcache.get(id)
    if (hit && hit.key === key) return hit.body
    const body = fs.promises.readFile(real).then((b) => compressBuf(b, enc))
    zcache.set(id, { key, body })
    body.catch(() => zcache.delete(id))
    return body
  }

  // ── HTTP ────────────────────────────────────────────────────────────────────
  const server = http.createServer((req, res) => {
    const ip = clientIp(req)
    const send = (code, body, headers = {}) => {
      res.writeHead(code, securityHeaders({ "cache-control": "no-store", ...headers }))
      res.end(req.method === "HEAD" ? undefined : body)
    }
    if (!httpAllowed(ip)) return send(429, "too many requests", { "content-type": "text/plain" })
    if (req.method !== "GET" && req.method !== "HEAD") return send(405, "method not allowed", { "content-type": "text/plain", allow: "GET, HEAD" })

    const pathOnly = String(req.url || "/").split("?")[0]
    let query
    try { query = new URL(req.url, "http://x").searchParams } catch { return send(400, "bad request") }

    if (pathOnly === "/healthz") return send(200, JSON.stringify({ ok: true, id: instanceId }), { "content-type": "application/json" })

    if (pathOnly === "/ms-friend-sw.js") return send(200, FRIEND_SW, { "content-type": "text/javascript; charset=utf-8", "service-worker-allowed": "/" })
    if (pathOnly === "/__pack.json") {
      let pk
      try { pk = packFor(renderPageHtml()) } catch { pk = null }
      if (!pk) return send(404, "no pack", { "content-type": "text/plain" })
      const enc = pickEncoding(req.headers["accept-encoding"])
      const head = { "content-type": "application/json", "x-ms-raw-length": String(pk.raw.length), "cache-control": "no-store" }
      if (!enc) return send(200, pk.raw, head)
      if (!pk.z.has(enc)) pk.z.set(enc, compressBuf(pk.raw, enc))
      return pk.z.get(enc).then((z) => send(200, z, { ...head, "content-encoding": enc, vary: "accept-encoding" }), () => send(200, pk.raw, head))
    }

    if (pathOnly === "/join" || pathOnly === "/join/") {
      const raw = query.get("room")
      const room = normalizeRoomCode(raw)
      if (raw && joinBlocked(ip)) return send(429, "Too many join attempts — try again later.", { "content-type": "text/plain" })
      const nonce = crypto.randomBytes(12).toString("base64")
      return send(200, joinPageHtml(room, nonce), {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}' 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      })
    }

    const m = /^\/api\/room\/([^/]+)$/.exec(pathOnly)
    if (m) {
      if (joinBlocked(ip)) return send(429, JSON.stringify({ ok: false, error: "too many attempts" }), { "content-type": "application/json" })
      const code = normalizeRoomCode(m[1])
      const room = code && rooms.get(code)
      if (!room) { noteJoinFailure(ip); return send(404, JSON.stringify({ ok: false, error: "room not found" }), { "content-type": "application/json" }) }
      const theirs = query.get("code")
      const players = occupied(room).length
      return send(200, JSON.stringify({
        ok: true, room: room.code, players, max: MAX_PLAYERS_PER_ROOM, full: SEATS.every((s) => room.seats[s]),
        hostVersion: buildInfo.appVersion, hostCode: buildInfo.codeHash,
        compatible: theirs == null ? null : (!!buildInfo.codeHash && theirs === buildInfo.codeHash),
        releasesUrl,
      }), { "content-type": "application/json" })
    }

    if (pathOnly.startsWith("/api/")) return send(404, "not found", { "content-type": "text/plain" })   // no dev APIs here, ever

    const rel = safeRelPath(req.url)
    if (!rel) return send(400, "bad path", { "content-type": "text/plain" })
    if (rel === "index.html") {
      let html
      try { html = opts.renderIndex ? opts.renderIndex() : fs.readFileSync(path.join(root, "index.html"), "utf8") }
      catch { return send(500, "index unavailable", { "content-type": "text/plain" }) }
      if (normalizeRoomCode(query.get("room"))) html = withFriendLoader(withJoinSplash(html))   // a friend arriving from a link
      const enc = pickEncoding(req.headers["accept-encoding"])
      if (!enc) return send(200, html, { "content-type": "text/html; charset=utf-8" })
      return compressBuf(Buffer.from(html, "utf8"), enc).then(
        (z) => send(200, z, { "content-type": "text/html; charset=utf-8", "content-encoding": enc, vary: "accept-encoding" }),
        () => send(200, html, { "content-type": "text/html; charset=utf-8" }))
    }
    if (!manifest.has(rel)) return send(404, "not found", { "content-type": "text/plain" })
    const file = path.join(root, rel)
    // Defence in depth: the real path (symlinks resolved) must still be inside the client root.
    let real
    try { real = fs.realpathSync(file) } catch { return send(404, "not found", { "content-type": "text/plain" }) }
    if (real !== realRoot && !real.startsWith(realRoot + path.sep)) return send(403, "forbidden", { "content-type": "text/plain" })
    fs.stat(real, (e, st) => {
      if (e || !st.isFile()) return send(404, "not found", { "content-type": "text/plain" })
      const ext = path.extname(rel).toLowerCase()
      const base = {
        "content-type": MIME[ext] || "application/octet-stream",
        "cache-control": (ext === ".js" || ext === ".mjs") && query.has("v") ? "public, max-age=31536000, immutable" : "public, max-age=300",
      }
      const enc = COMPRESSIBLE.has(ext) && st.size > 1024 ? pickEncoding(req.headers["accept-encoding"]) : null
      if (enc) {
        return compressedFile(real, st, enc).then((z) => {
          res.writeHead(200, securityHeaders({ ...base, "content-encoding": enc, vary: "accept-encoding", "content-length": z.length }))
          res.end(req.method === "HEAD" ? undefined : z)
        }, () => {   // compression failed → plain bytes
          res.writeHead(200, securityHeaders({ ...base, "content-length": st.size }))
          if (req.method === "HEAD") return res.end()
          fs.createReadStream(real).on("error", () => res.destroy()).pipe(res)
        })
      }
      const headers = securityHeaders({ ...base, "content-length": st.size })
      if (COMPRESSIBLE.has(ext)) headers.vary = "accept-encoding"
      res.writeHead(200, headers)
      if (req.method === "HEAD") return res.end()
      fs.createReadStream(real).on("error", () => res.destroy()).pipe(res)
    })
  })
  server.headersTimeout = 15_000
  server.requestTimeout = 30_000

  // ── WebSocket relay ─────────────────────────────────────────────────────────
  const wss = new WebSocketServer({ noServer: true, maxPayload: L.maxPayload, perMessageDeflate: false, clientTracking: false })

  server.on("upgrade", (req, socket, head) => {
    const ip = clientIp(req)
    const reject = (code, text) => { try { socket.write(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`) } catch {} ; socket.destroy() }
    let u
    try { u = new URL(req.url, "http://x") } catch { return reject(400, "Bad Request") }
    // Legacy LAN path: the in-game ONLINE (LAN) code encodes ws://<lan-ip>:<port>/ with no room. Accept it
    // ONLY from a direct LAN/loopback peer (never via the tunnel) and map it to the host's main room.
    if (u.pathname === "/" && !isForwarded(req) && isDirectLan(req) && opts.legacyLanRoom) {
      const main = opts.legacyLanRoom()
      if (main && rooms.has(main)) u.searchParams.set("room", main)
      else return reject(404, "Not Found")
    } else if (u.pathname !== "/ws") return reject(404, "Not Found")
    if (!originAllowed(req)) { log(`[host] ws from ${ip} refused: origin ${req.headers.origin}`); return reject(403, "Forbidden") }
    if (joinBlocked(ip)) return reject(429, "Too Many Requests")
    if (conns.size >= L.maxConnections || (perIpConns.get(ip) || 0) >= L.maxConnectionsPerIp) return reject(503, "Service Unavailable")
    wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, req, ip, u.searchParams))
  })

  function onConnection(ws, req, ip, params) {
    conns.add(ws)
    perIpConns.set(ip, (perIpConns.get(ip) || 0) + 1)
    ws._ip = ip
    ws._bad = 0
    ws._win = { start: now(), n: 0 }
    ws._alive = now()
    const sendJson = (m) => { if (ws.readyState === 1) ws.send(encode(m)) }
    const refuse = (reason, closeCode, extra = {}) => { sendJson({ ...makeReject(reason, extra.theirs ?? null), ...extra }); try { ws.close(closeCode, String(reason).slice(0, 100)) } catch {} }

    const code = normalizeRoomCode(params.get("room"))
    const room = code && rooms.get(code)
    if (!room) { noteJoinFailure(ip); return refuse("Room not found — it may have closed. Ask your friend for a new link.", 4404) }
    ws._room = room
    const hostTok = params.get("host")
    const wantsHost = !!hostTok
    const tokenOk = wantsHost && hostTok.length === room.hostToken.length &&
      crypto.timingSafeEqual(Buffer.from(hostTok), Buffer.from(room.hostToken))
    if (wantsHost && !tokenOk) { noteJoinFailure(ip); return refuse("Bad host credentials.", 4403) }

    const helloTimer = setTimeout(() => { if (!ws._side) refuse("No hello received.", 4002) }, L.helloTimeoutMs)

    ws.on("pong", () => { ws._alive = now(); if (ws._pingAt) { ws._rtt = now() - ws._pingAt; ws._pingAt = 0 } })

    ws.on("message", (raw, isBinary) => {
      // per-client rate cap (1-second window)
      const t = now()
      if (t - ws._win.start >= 1000) { ws._win.start = t; ws._win.n = 0 }
      if (++ws._win.n > L.msgsPerSecond) { log(`[host] ${ip} exceeded ${L.msgsPerSecond} msg/s — dropped`); try { ws.close(4008, "rate limit") } catch {} ; return }
      if (isBinary) return strike()
      const msg = decode(raw)
      if (msg.t === null) return strike()

      if (!ws._side) {
        if (msg.t !== MSG.HELLO) return strike()
        clearTimeout(helloTimer)
        const verdict = checkHello(msg)
        const theirCode = msg.build && typeof msg.build.code === "string" ? msg.build.code.slice(0, 64) : null
        const theirVer = msg.build && typeof msg.build.app === "string" ? msg.build.app.slice(0, 32) : null
        if (!verdict.ok || !buildInfo.codeHash || theirCode !== buildInfo.codeHash) {
          const reason = !verdict.ok ? verdict.reason
            : `Version mismatch: the host runs build ${buildInfo.appVersion || "?"} (${buildInfo.codeHash}), you have ${theirVer || "?"} (${theirCode || "unknown"}). Download the matching version.`
          log(`[host] ${ip} rejected: ${reason}`)
          return refuse(reason, 4001, { theirs: typeof msg.stamp === "string" ? msg.stamp.slice(0, 64) : null, mismatch: true, hostVersion: buildInfo.appVersion, releasesUrl })
        }
        let side
        if (tokenOk) {
          side = "p1"
          const prev = room.seats.p1
          if (prev && prev !== ws) { try { prev.close(4009, "replaced by a new host connection") } catch {} }
        } else {
          side = SEATS.slice(1).find((s) => !room.seats[s])   // first free friend seat: p2, p3, p4
          if (!side) return refuse(`This room is full (${MAX_PLAYERS_PER_ROOM} players). Spectating is not supported.`, 4002)
        }
        room.seats[side] = ws
        ws._side = side
        ws._isHost = side === "p1"
        ws._name = typeof msg.name === "string" ? msg.name.replace(/[^\w .-]/g, "").slice(0, 24) : null
        sendJson(makeWelcome(side, occupied(room).length))
        broadcastLobby(room)
        log(`[host] ${ip} joined room ${room.code} as ${side}`)
        emitChange()
        return
      }

      // Everything a player sends goes to EVERY other player in the room (2–4 players).
      const fwd = (m) => { const out = encode(m); for (const k of SEATS) { const p = room.seats[k]; if (p && p !== ws && p.readyState === 1) p.send(out) } }
      switch (msg.t) {
        case MSG.PING: {
          const p = msg.payload
          return sendJson({ t: MSG.PONG, payload: (typeof p === "string" && p.length <= 64) || typeof p === "number" || p === null || p === undefined ? (p ?? null) : null })
        }
        case MSG.INPUT: {
          const { side, frame, mask } = msg
          if (side !== ws._side || !Number.isInteger(frame) || frame < 0 || frame > 1e8 || !Number.isInteger(mask) || mask < 0 || mask > 0x3fff) return strike()
          return fwd({ t: MSG.INPUT, side, frame, mask })
        }
        case MSG.MATCH_SETUP: {
          if (ws._side !== "p1") return strike()        // only the host sets up a match
          const clean = sanitizeSetup(msg)
          if (!clean) return strike()
          return fwd(clean)
        }
        case MSG.BYE:
          return fwd({ t: MSG.BYE, side: ws._side, reason: typeof msg.reason === "string" ? msg.reason.slice(0, 80) : null })
        case MSG.PICK: {                                  // "my fighter" (pick-your-own select): rebuilt, ids only
          const clean = makePick(msg)
          if (!clean.char) return strike()
          return fwd({ ...clean, side: ws._side })      // stamped by the relay: whose pick this is
        }
        default:
          return strike()
      }
    })

    function strike() {
      if (++ws._bad >= L.badMessagesBeforeDrop) { log(`[host] ${ip} dropped: too many invalid messages`); try { ws.close(4003, "invalid messages") } catch {} }
    }

    ws.on("close", () => {
      clearTimeout(helloTimer)
      conns.delete(ws)
      const n = (perIpConns.get(ip) || 1) - 1
      if (n <= 0) perIpConns.delete(ip); else perIpConns.set(ip, n)
      if (ws._side && room.seats[ws._side] === ws) {
        room.seats[ws._side] = null
        if (rooms.get(room.code) === room) broadcastLobby(room)
      }
      emitChange()
    })
    ws.on("error", () => {})
  }

  // Heartbeat: measures ping for the host panel and drops dead sockets.
  const hb = setInterval(() => {
    const t = now()
    let changed = false
    for (const ws of conns) {
      if (t - ws._alive > L.deadAfterMs) { try { ws.terminate() } catch {} ; continue }
      ws._pingAt = t
      try { ws.ping() } catch {}
      if (ws._side) changed = true
    }
    if (changed) emitChange()
  }, L.heartbeatMs)
  hb.unref?.()

  // Listen on `preferred`, walking up to +maxTries ports on EADDRINUSE, then any free port (0). Never throws
  // EADDRINUSE to the caller.
  function listen(preferred = DEFAULT_HOST_PORT, host = "0.0.0.0", maxTries = 20) {
    const tryPort = (p) => new Promise((resolve, reject) => {
      const onErr = (e) => { server.off("listening", onOk); reject(e) }
      const onOk = () => { server.off("error", onErr); resolve(server.address().port) }
      server.once("error", onErr)
      server.once("listening", onOk)
      server.listen(p, host)
    })
    return (async () => {
      const candidates = []
      for (let i = 0; i < maxTries; i++) candidates.push(preferred + i)
      candidates.push(0)
      let lastErr
      for (const p of candidates) {
        try { listenPort = await tryPort(p); log(`[host] public host server listening on ${host}:${listenPort}`); return listenPort }
        catch (e) { lastErr = e; if (e.code !== "EADDRINUSE" && e.code !== "EACCES") break }
      }
      throw lastErr
    })()
  }

  function close() {
    clearInterval(hb)
    for (const code of [...rooms.keys()]) closeRoom(code, "The host stopped hosting.")
    for (const ws of conns) { try { ws.terminate() } catch {} }
    conns.clear()
    return new Promise((resolve) => {
      if (!server.listening) return resolve()
      server.close(() => resolve())
      server.closeAllConnections?.()
    })
  }

  return {
    server, listen, close, createRoom, closeRoom, instanceId,
    rooms: () => [...rooms.keys()],
    hasRoom: (c) => rooms.has(c),
    snapshot,
    port: () => listenPort,
    setPublicOrigins: (list) => { publicOrigins = new Set((list || []).map((o) => { try { return new URL(o).origin } catch { return null } }).filter(Boolean)) },
    onChange: (cb) => { changeCb = typeof cb === "function" ? cb : () => {} },
    _limits: L,
  }
}

function isDirectLan(req) {
  const ra = stripV6(req.socket.remoteAddress)
  const host = String(req.headers.host || "").replace(/:\d+$/, "").replace(/^\[|\]$/g, "")
  if (/trycloudflare\.com$/i.test(host)) return false
  return isLoopback(ra) || isPrivateIp(ra)
}

export function isPrivateIp(h) {
  return /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^169\.254\./.test(h) || /^fd|^fe80:/i.test(h)
}

// MATCH_SETUP: rebuild from scratch via protocol.makeMatchSetup, with extra type/length limits on the
// free-form strings so a peer can never smuggle anything but plain identifiers through the relay.
function sanitizeSetup(m) {
  const id = (v) => (typeof v === "string" && v.length <= 64 && /^[\w .:'()&+-]*$/.test(v)) ? v : null
  if (!Number.isInteger(m.seed) && typeof m.seed !== "number") return null
  const aliens = (a) => Array.isArray(a) && a.length <= 16 ? a.map(id).filter((x) => x !== null) : null
  const out = makeMatchSetup({
    seed: m.seed >>> 0, mode: id(m.mode), rounds: Number.isInteger(m.rounds) && m.rounds > 0 && m.rounds < 20 ? m.rounds : null,
    p1Char: id(m.p1Char), p1Skin: id(m.p1Skin) || "default", p2Char: id(m.p2Char), p2Skin: id(m.p2Skin) || "default",
    stage: id(m.stage), benExperimental: !!m.benExperimental, p1Aliens: aliens(m.p1Aliens), p2Aliens: aliens(m.p2Aliens),
    slowMo: m.slowMo, hitstopStyle: m.hitstopStyle, weather: id(m.weather), weatherFx: m.weatherFx, inputDelay: m.inputDelay,
    players: m.players,
  })
  if (!out.p1Char || !out.p2Char) return null
  return out
}
