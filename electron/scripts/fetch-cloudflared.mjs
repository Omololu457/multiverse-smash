// electron/scripts/fetch-cloudflared.mjs — MSV1-HOST (release CI only): download the PINNED cloudflared for one
// platform, verify its SHA-256 against net/tunnel.mjs (refuses on mismatch), and place it in
// electron/vendor/cloudflared/ so electron-builder bundles it as resources/cloudflared/. Apache-2.0 → NOTICE.
//   node electron/scripts/fetch-cloudflared.mjs <darwin-arm64|darwin-x64|win32-x64|linux-x64|linux-arm64>
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { downloadCloudflared, CLOUDFLARED_ASSETS, CLOUDFLARED_VERSION } from "../../net/tunnel.mjs"

const key = process.argv[2]
if (!CLOUDFLARED_ASSETS[key]) { console.error(`usage: fetch-cloudflared.mjs <${Object.keys(CLOUDFLARED_ASSETS).join("|")}>`); process.exit(2) }
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "vendor", "cloudflared")
fs.rmSync(dir, { recursive: true, force: true })
const { bin } = await downloadCloudflared({ cacheDir: dir, key, onProgress: (p) => p.pct % 25 === 0 && console.log(p.text) })
// downloadCloudflared names the file for the CURRENT platform; CI always runs on the target platform.
fs.rmSync(bin + ".sha256", { force: true })
fs.writeFileSync(path.join(dir, "NOTICE.txt"),
  `cloudflared ${CLOUDFLARED_VERSION} (${CLOUDFLARED_ASSETS[key].file}) — Copyright Cloudflare, Inc.\n` +
  `Licensed under the Apache License, Version 2.0: https://github.com/cloudflare/cloudflared/blob/master/LICENSE\n` +
  `Downloaded from https://github.com/cloudflare/cloudflared/releases/tag/${CLOUDFLARED_VERSION}, SHA-256 verified: ${CLOUDFLARED_ASSETS[key].sha256}\n`)
console.log(`cloudflared ${CLOUDFLARED_VERSION} for ${key} verified → ${path.relative(process.cwd(), bin)}`)
