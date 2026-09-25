# Multiverse Smash — Online (LAN) Quick-Start

Play a **2-device match over your local network** (same Wi-Fi / same router).
No accounts, no servers, no port-forwarding — the desktop app runs its own LAN
relay automatically.

> **One command per machine.** Each player runs `npm run desktop` (see
> `BETA_SETUP.md` for the one-time install). You land straight in the game — no
> browser, no URLs, no typing IP addresses.

---

## The 60-second version

**Both devices must be on the same network.** One person hosts, the other joins.

### Host (device A)

1. `npm run desktop`
2. On the title screen press **PLAY**.
3. Choose **ONLINE (LAN)**.
4. Choose **HOST**.
5. The screen shows a short **join CODE** (e.g. `A7K3-9F`). Read it out to the
   other player. Leave this screen up — it says *"Waiting for an opponent to
   join…"*.

### Join (device B)

1. `npm run desktop`
2. **PLAY → ONLINE (LAN) → JOIN**.
3. Type the host's **CODE**, then **Connect**.
4. Once connected, pick your fighters and the match starts on both screens.

That's it. If they're on the same network, it just connects.

---

## Where the LAN option lives (important)

Reach LAN from **title → PLAY → "ONLINE (LAN)"**. 

⚠️ There is a *separate* **"ONLINE"** entry on the **main menu** that shows
*"Coming soon"* and is **locked** — that is an old placeholder, **not** the LAN
feature. Ignore it. The working 2-device match is under **PLAY → ONLINE (LAN)**.

---

## Requirements & notes

- **Same LAN:** both machines on the same Wi-Fi/router (or a wired switch). This
  is local play — it does not work across the internet without a VPN.
- **The host runs the relay automatically.** `npm run desktop` (or `npm run dev`)
  starts a WebSocket relay on the host and discovers its LAN address; the join
  CODE encodes that address, so the joiner never types an IP.
- **Firewall:** on the host, allow the app/Node to accept incoming LAN
  connections the first time (macOS/Windows may prompt). Default port is `8787`
  (override with `LAN_PORT=<port>` before launching if it's taken).
- **Advanced / fallback:** the host screen also shows the full `ws://<ip>:<port>`
  address in small text; the joiner can paste that instead of the code if the
  code ever fails.

---

## Browser instead of the desktop app

If a machine is running the browser build (`npm run dev`, then open the printed
`http://localhost:8000`), the **same PLAY → ONLINE (LAN)** path works — `npm run
dev` also starts the LAN relay and serves the page to the LAN. The desktop app is
just the zero-friction version (no browser, auto-fullscreen).

---

## Troubleshooting

- **"No LAN relay found"** on the host → you opened a static build with no
  server. Launch with `npm run desktop` (recommended) or `npm run dev`, not a
  bare file open.
- **Join can't connect** → confirm both devices are on the *same* network (not
  one on Wi-Fi + one on a guest network), and that the host allowed the firewall
  prompt. Try the full `ws://…` address from the host screen.
- **Desktop app won't launch at all** → that's an install issue, not a LAN issue
  — see the Node-version note in `BETA_SETUP.md` (use Node LTS 20/22), or use the
  browser build.
