// harness/net_lancode.test.mjs — Stage 3b proof: the short LAN JOIN CODE ↔ ws://ip:port codec is correct.
//
// Pure unit test (no network). Verifies the code the host displays decodes back to the EXACT ip+port the
// joiner needs, that common home addresses stay short, that typos/case/separators are forgiven, and that a
// corrupted code is rejected by the checksum (so a mistyped code fails fast instead of dialing a wrong host).
import { encodeLanCode, decodeLanCode, DEFAULT_PORT } from "../net/lanCode.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };

// 1. Round-trips across the common LAN ranges + edge cases.
const cases = [
  ["192.168.1.20", 8787], ["192.168.0.100", 8787], ["192.168.1.1", 8787],
  ["10.0.0.5", 8787], ["10.13.37.200", 8787], ["172.16.5.9", 8787], ["172.31.255.254", 8787],
  ["127.0.0.1", 8797], ["192.168.1.20", 9999], ["8.8.8.8", 8787],
];
let allRt = true, maxHome = 0;
for (const [ip, port] of cases) {
  const code = encodeLanCode(ip, port);
  const back = decodeLanCode(code);
  const good = back && back.ip === ip && back.port === port;
  if (!good) { allRt = false; console.log(`     ${ip}:${port} -> ${code} -> ${JSON.stringify(back)}`); }
  if (ip.startsWith("192.168.") && port === DEFAULT_PORT) maxHome = Math.max(maxHome, code.length);
}
check("all round-trips recover the exact ip:port", allRt);
check("common home codes (192.168.x.y:8787) are short (≤6 chars)", maxHome > 0 && maxHome <= 6, `maxHomeLen=${maxHome}`);

// 2. Human forgiveness: lowercase, spaces/dashes, and Crockford look-alikes all still decode.
const home = encodeLanCode("192.168.1.20", 8787);
const messy = decodeLanCode(home.toLowerCase().split("").join(" - "));
check("lowercase + separators still decode", messy && messy.ip === "192.168.1.20" && messy.port === 8787, `"${home}" -> ${JSON.stringify(messy)}`);

// 3. Checksum rejects a corrupted / mistyped code (change one char).
const flip = (s) => { const a = s.split(""); a[1] = a[1] === "0" ? "1" : "0"; return a.join(""); };
const corrupted = flip(home);
check("a one-char corruption is rejected (checksum)", corrupted === home || decodeLanCode(corrupted) === null, `orig=${home} corrupt=${corrupted}`);
check("obvious garbage is rejected", decodeLanCode("") === null && decodeLanCode("!!") === null);

// 4. Bad IPs don't produce a code.
check("invalid IP → null code", encodeLanCode("999.1.1.1") === null && encodeLanCode("not-an-ip") === null);

console.log(`\nNET LANCODE (Stage 3b): ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
