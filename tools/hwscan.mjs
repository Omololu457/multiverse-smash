// tools/hwscan.mjs — launcher-side HARDWARE SCAN (Node, no npm deps). Windows / macOS / Linux.
//   node tools/hwscan.mjs          → prints the profile and writes hw_profile.local.json next to the game
// Every probe is optional: a missing tool / permission / timeout just leaves that field empty.
// Read-only — it only ASKS the OS what hardware exists; it changes nothing.
import os from "node:os"; import fs from "node:fs"; import path from "node:path"
import { execFile } from "node:child_process"; import { fileURLToPath } from "node:url"

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
export const PROFILE_PATH = path.join(REPO, "hw_profile.local.json")

function run(cmd, args, timeout = 8000) {
  return new Promise(res => {
    try {
      execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => res(err && !stdout ? "" : String(stdout || "")))
    } catch (_) { res("") }
  })
}
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const gb = bytes => Math.round(bytes / 1073741824 * 10) / 10

async function windowsProbe() {
  // One PowerShell call (CIM; works on Windows 10/11 incl. builds where wmic was removed).
  const ps = `
$ErrorActionPreference='SilentlyContinue'
$o=@{}
$o.gpu=@(Get-CimInstance Win32_VideoController | ForEach-Object { @{name=$_.Name; ram=$_.AdapterRAM; w=$_.CurrentHorizontalResolution; h=$_.CurrentVerticalResolution; hz=$_.CurrentRefreshRate; drv=$_.DriverVersion} })
$o.vram=@(Get-ItemProperty 'HKLM:\\SYSTEM\\ControlSet001\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0*' -Name 'HardwareInformation.qwMemorySize','DriverDesc' | ForEach-Object { @{name=$_.DriverDesc; bytes=$_.'HardwareInformation.qwMemorySize'} })
$p=Get-CimInstance Win32_Processor | Select-Object -First 1
$o.cpu=@{name=$p.Name; cores=(Get-CimInstance Win32_Processor | Measure-Object -Property NumberOfCores -Sum).Sum; threads=(Get-CimInstance Win32_Processor | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum; mhz=$p.MaxClockSpeed}
$os=Get-CimInstance Win32_OperatingSystem
$o.os=$os.Caption + ' ' + $os.Version
$b=Get-CimInstance Win32_Battery
$o.battery=[bool]$b
$o | ConvertTo-Json -Depth 4 -Compress`
  let out = await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps], 15000)
  let j = null; try { j = JSON.parse(out.trim()) } catch (_) {}
  if (j) {
    const arr = v => Array.isArray(v) ? v : v ? [v] : []
    const vram = arr(j.vram)
    const gpus = arr(j.gpu).filter(g => g && g.name).map(g => {
      const v = vram.find(x => x && x.name && g.name && x.name.trim() === g.name.trim() && num(x.bytes) > 0)
      const bytes = v ? num(v.bytes) : num(g.ram)          // AdapterRAM is 32-bit (caps at 4 GB); the registry value isn't
      return { name: String(g.name).trim(), vramGB: bytes ? gb(bytes) : 0, driver: g.drv || "" }
    })
    const displays = arr(j.gpu).filter(g => g && num(g.w) > 0).map(g => ({ w: num(g.w), h: num(g.h), hz: num(g.hz) }))
    return { gpus, displays, cpuName: j.cpu?.name, cores: num(j.cpu?.cores), threads: num(j.cpu?.threads), mhz: num(j.cpu?.mhz), osName: j.os, battery: !!j.battery }
  }
  // Fallback: wmic (older Windows)
  out = await run("wmic", ["path", "win32_VideoController", "get", "name,AdapterRAM", "/format:csv"])
  const gpus = out.split(/\r?\n/).slice(1).map(l => l.split(",")).filter(p => p.length >= 3 && p[2]).map(p => ({ name: p[2].trim(), vramGB: num(p[1]) ? gb(num(p[1])) : 0 }))
  return { gpus, displays: [] }
}

async function macProbe() {
  const out = await run("system_profiler", ["SPDisplaysDataType", "-json"], 15000)
  const gpus = [], displays = []
  try {
    const j = JSON.parse(out)
    for (const g of j.SPDisplaysDataType || []) {
      const vr = String(g.spdisplays_vram || g.spdisplays_vram_shared || "")
      const m = vr.match(/([\d.]+)\s*(GB|MB)/i)
      gpus.push({ name: g.sppci_model || g._name || "GPU", vramGB: m ? (m[2].toUpperCase() === "GB" ? num(m[1]) : gb(num(m[1]) * 1048576)) : 0, cores: num(g.sppci_cores) || 0 })
      for (const d of g.spdisplays_ndrvs || []) {
        const px = String(d._spdisplays_pixels || d.spdisplays_pixels || "").match(/(\d+)\s*x\s*(\d+)/)
        const rs = String(d._spdisplays_resolution || d.spdisplays_resolution || "")
        const ui = rs.match(/(\d+)\s*x\s*(\d+)/), hz = rs.match(/@\s*([\d.]+)\s*Hz/i)
        displays.push({ name: d._name || "", w: px ? num(px[1]) : ui ? num(ui[1]) : 0, h: px ? num(px[2]) : ui ? num(ui[2]) : 0, hz: hz ? Math.round(num(hz[1])) : 0, builtin: /internal|built-?in/i.test(String(d.spdisplays_connection_type || d._name || "")) })
      }
    }
  } catch (_) {}
  const cores = num((await run("sysctl", ["-n", "hw.physicalcpu"])).trim())
  const brand = (await run("sysctl", ["-n", "machdep.cpu.brand_string"])).trim()
  const ver = (await run("sw_vers", ["-productVersion"])).trim()
  const batt = await run("pmset", ["-g", "batt"])
  return { gpus, displays, cores, cpuName: brand, osName: ver ? `macOS ${ver}` : "", battery: /InternalBattery/i.test(batt), onBattery: /Battery Power/i.test(batt) }
}

async function linuxProbe() {
  const gpus = [], displays = []
  const lspci = await run("lspci", ["-mm"])
  for (const l of lspci.split("\n")) if (/VGA|3D controller|Display controller/i.test(l)) {
    const parts = l.match(/"([^"]*)"/g)?.map(s => s.slice(1, -1)) || []
    gpus.push({ name: [parts[1], parts[2]].filter(Boolean).join(" ") || l.trim(), vramGB: 0 })
  }
  const glx = await run("glxinfo", ["-B"])
  const r = glx.match(/OpenGL renderer string:\s*(.+)/), vm = glx.match(/Video memory:\s*(\d+)\s*MB/i)
  if (r) gpus.unshift({ name: r[1].trim(), vramGB: vm ? gb(num(vm[1]) * 1048576) : 0, via: "glxinfo" })
  const nv = await run("nvidia-smi", ["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"])
  for (const l of nv.split("\n").filter(Boolean)) { const [n, m] = l.split(","); gpus.unshift({ name: n.trim(), vramGB: gb(num(m) * 1048576), via: "nvidia-smi" }) }
  const xr = await run("xrandr", ["--current"])
  for (const l of xr.split("\n")) { const m = l.match(/^\s+(\d+)x(\d+)\s+.*?([\d.]+)\*/); if (m) displays.push({ w: num(m[1]), h: num(m[2]), hz: Math.round(num(m[3])) }) }
  const lscpu = await run("lscpu", [])
  const cps = num(lscpu.match(/Core\(s\) per socket:\s*(\d+)/)?.[1]), sk = num(lscpu.match(/Socket\(s\):\s*(\d+)/)?.[1]) || 1
  let osName = ""; try { osName = (fs.readFileSync("/etc/os-release", "utf8").match(/PRETTY_NAME="?([^"\n]+)/) || [])[1] || "" } catch (_) {}
  let battery = false; try { battery = fs.readdirSync("/sys/class/power_supply").some(n => /^BAT/i.test(n)) } catch (_) {}
  // de-duplicate by name
  const seen = new Set(); const uniq = gpus.filter(g => { const k = g.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
  return { gpus: uniq, displays, cores: cps * sk, osName, battery }
}

function hintTier(p) {
  // A quick guess from names only — the in-browser benchmark makes the real decision.
  const names = p.gpus.map(g => g.name.toLowerCase()).join(" | ")
  const threads = p.cpu.threads || 0, ram = p.ramGB || 0
  let t = 2
  if (/rtx\s*[2-9]0[5-9]0|rtx\s*[2-9]0[6-9]0|rx\s*[67]\d{3}|rx\s*9\d{3}|apple m\d (pro|max|ultra)|titan|arc b|radeon pro w/.test(names)) t = 4
  else if (/rtx|gtx\s*1(0[6-8]|6[56])|rx\s*5[67]\d\d|arc a7/.test(names)) t = 3
  else if (/gtx|radeon rx|apple m\d|arc/.test(names)) t = 2
  else if (/intel|uhd|iris|radeon\(tm\)|radeon graphics|vega/.test(names)) t = 1
  if (/llvmpipe|swiftshader|basic render|software/.test(names)) t = 0
  if (threads && threads <= 4) t = Math.min(t, 2)
  if (ram && ram < 6) t = Math.min(t, 1)
  return ["low", "medium", "high", "ultra", "max"][t]
}

export async function scanHardware() {
  const cpus = os.cpus() || []
  const plat = process.platform
  let x = {}
  try { x = plat === "win32" ? await windowsProbe() : plat === "darwin" ? await macProbe() : await linuxProbe() } catch (_) { x = {} }
  const p = {
    scannedAt: new Date().toISOString(),
    os: { platform: plat, name: x.osName || `${os.type()} ${os.release()}`, arch: os.arch() },
    cpu: {
      model: (x.cpuName || cpus[0]?.model || "unknown").replace(/\s+/g, " ").trim(),
      cores: x.cores || 0,
      threads: x.threads || (typeof os.availableParallelism === "function" ? os.availableParallelism() : cpus.length),
      ghz: Math.round((x.mhz || cpus[0]?.speed || 0) / 100) / 10,
    },
    ramGB: gb(os.totalmem()),
    gpus: x.gpus || [],
    displays: x.displays || [],
    laptop: !!x.battery, onBattery: !!x.onBattery,
    node: process.version,
  }
  p.hintTier = hintTier(p)
  return p
}

// Compact form for the URL hand-off to the game (keeps the query string short).
export function compactProfile(p) {
  return {
    os: { name: p.os.name }, cpu: { model: p.cpu.model, cores: p.cpu.cores, threads: p.cpu.threads, ghz: p.cpu.ghz }, ramGB: p.ramGB,
    gpus: p.gpus.slice(0, 3).map(g => ({ name: g.name, vramGB: g.vramGB })), displays: p.displays.slice(0, 3).map(d => ({ w: d.w, h: d.h, hz: d.hz })),
    laptop: p.laptop, hintTier: p.hintTier,
  }
}

export function printProfile(p) {
  const L = []
  L.push(`  OS       ${p.os.name} (${p.os.arch})`)
  L.push(`  CPU      ${p.cpu.model}  ·  ${p.cpu.cores || "?"} cores / ${p.cpu.threads} threads${p.cpu.ghz ? `  ·  ${p.cpu.ghz} GHz` : ""}`)
  L.push(`  RAM      ${p.ramGB} GB`)
  for (const g of p.gpus.length ? p.gpus : [{ name: "(not detected — the game will detect it in the browser)" }]) L.push(`  GPU      ${g.name}${g.vramGB ? `  ·  ${g.vramGB} GB` : ""}`)
  for (const d of p.displays) L.push(`  Display  ${d.w}×${d.h}${d.hz ? ` @ ${d.hz} Hz` : ""}${d.name ? `  (${d.name})` : ""}`)
  L.push(`  Laptop   ${p.laptop ? (p.onBattery ? "yes — ON BATTERY (quality will be capped until plugged in)" : "yes") : "no"}`)
  L.push(`  First guess: ${p.hintTier.toUpperCase()}  (the game benchmarks itself on first start and picks the final tier)`)
  return L.join("\n")
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const p = await scanHardware()
  try { fs.writeFileSync(PROFILE_PATH, JSON.stringify(p, null, 2)) } catch (_) {}
  console.log("\nHardware scan\n" + printProfile(p) + `\n\n  saved → ${PROFILE_PATH}\n`)
}
