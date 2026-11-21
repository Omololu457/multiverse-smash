// PLAY.mjs — click this file in your editor and press Run (or run `node PLAY.mjs`).
// Starts the game's local server (tools/serve.mjs) and opens the game in your web browser.
//   node PLAY.mjs            → the game
//   node PLAY.mjs controls   → the Controls Lab (controls.html)
// Leave it running while you play; press Stop (or Ctrl+C) to shut the server down.
import net from "node:net"; import { exec } from "node:child_process"

const page = /controls/i.test(process.argv[2] || "") ? "controls.html" : "index.html"
const free = p => new Promise(r => { const s = net.createServer().once("error", () => r(false)).once("listening", () => s.close(() => r(true))).listen(p) })
let port = 8000; while (!(await free(port))) port++
process.env.PORT = String(port)
await import("./tools/serve.mjs")
const url = `http://localhost:${port}/${page}`
const cmd = process.platform === "darwin" ? `open "${url}"` : process.platform === "win32" ? `start "" "${url}"` : `xdg-open "${url}"`
if (!process.env.NO_OPEN) exec(cmd)
console.log(`\n▶ Multiverse Smash is running at ${url}\n  (opened in your browser — keep this running while you play; Stop / Ctrl+C to quit)\n`)
