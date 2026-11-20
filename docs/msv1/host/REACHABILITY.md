# MSV1-HOST — Reachability: how a friend outside your house connects

When the desktop app starts hosting it opens **one** public host server (port 8790, or the next free port)
and then tries these routes in order, stopping at the first one that works. The LAN link is shown in every
case.

| # | Route | What it needs | Link looks like |
|---|---|---|---|
| 1 | **Cloudflare quick tunnel** | outbound internet; no account, no router changes | `https://<random-words>.trycloudflare.com/join?room=ABC234` |
| 2 | **UPnP port mapping** | a router with UPnP-IGD enabled, a real public IPv4 | `http://<public-ip>:8790/join?room=ABC234` |
| 3 | **LAN only** (always on) | friend on the same Wi-Fi / network | `http://192.168.x.y:8790/join?room=ABC234` |

If neither internet route works, the panel says so in plain words (for example: *"Internet hosting
unavailable (tunnel: …; UPnP: …). People on your own network can still join with the LAN link."*) and LAN
hosting keeps running.

## 1. Cloudflare quick tunnel (primary)

- The app runs `cloudflared tunnel --no-autoupdate --url http://127.0.0.1:<hostPort>` as a child process and
  reads the `https://….trycloudflare.com` URL that cloudflared prints. HTTP and the WebSocket relay both go
  through it (`wss://…/ws?room=CODE`).
- **Where cloudflared comes from** (`net/tunnel.mjs`), in order:
  1. bundled inside the installed app (`resources/cloudflared/`), placed there by the release workflow after
     checking the pinned SHA-256;
  2. a `cloudflared` you installed yourself (on PATH);
  3. otherwise the app downloads the pinned official release (**2026.11.1**) from
     `github.com/cloudflare/cloudflared`, shows "Downloading the Cloudflare tunnel helper… N%", **checks the
     SHA-256 against the value pinned in the code before extracting**, caches it in the app's data folder,
     and re-hashes the cached copy before every launch. On a mismatch it refuses to run it.
  cloudflared is Apache-2.0, so bundling it is allowed (a NOTICE is shipped next to it).
- **Drops**: if cloudflared exits, it restarts with backoff (2 s, 4 s, … up to 60 s). A restart gets a
  **new URL**; the panel updates the link and says the old one stopped working.
- **Stop Hosting / Quit** kill the process (TERM, then KILL after 2 s; a synchronous kill on exit), so no
  cloudflared is left running.

### Limitations (honest)
- **The URL changes on every launch** (and after any tunnel restart). Send friends the new link each session.
- **Latency**: traffic goes you → Cloudflare edge → friend. Typically it adds 10–60 ms each way, depending on
  where you both are. Lockstep with a 2-frame input delay hides small latency; a high or jittery ping
  shows up as short stalls (the sim waits, it never desyncs).
- Quick tunnels are a free, best-effort Cloudflare service with no uptime guarantee and rate limits. They
  are meant for testing and casual use.
- Networks that block outbound connections to Cloudflare (some schools/offices, strict firewalls) stop the
  tunnel. The app then falls back to UPnP, then LAN.
- Bandwidth: a friend's browser downloads the game files (**~2.3 GB if they load every asset**; in practice
  only what the menus and fighters use) from **your** computer through the tunnel, so the first load can be
  slow on a slow upload. Desktop-app friends do not download game files from you.

### Optional upgrade: a stable named tunnel (note only, not implemented)
With a free Cloudflare account and a domain on Cloudflare, `cloudflared tunnel create multiverse` +
`cloudflared tunnel route dns multiverse play.example.com` gives a **permanent** hostname
(`https://play.example.com/join?room=…`). The app would run `cloudflared tunnel run --token <token>` instead
of a quick tunnel, and the token would live in the OS keychain, never in the repo.

## 2. UPnP (secondary)

`net/upnp.mjs` sends an SSDP search for an Internet Gateway Device, adds a TCP mapping `hostPort → this
computer`, and asks the router for its public IP. The app **only shows the UPnP link as working after it
fetched `http://<public-ip>:<port>/healthz` and got back this server's random instance id**. Otherwise it
removes the mapping and reports UPnP as unavailable. Limits:
- Many routers have UPnP **disabled**, which is the safer default.
- **CGNAT** (common on mobile and some fibre ISPs) means the router's "public" IP is not reachable from the
  internet, so UPnP cannot help. The verification catches this.
- **Hairpin NAT**: some routers can't reach their own public IP from inside, so verification fails even
  though friends could connect. We still don't claim it works. The tunnel is the main route.
- The mapping is removed on Stop Hosting / Quit. If the app is force-killed, the router drops it when the
  1-hour lease expires.

## 3. LAN (always)

`http://<lan-ip>:<port>/join?room=CODE` for each non-internal IPv4 interface. A same-network friend opens it
in a browser, or pastes it into their desktop app. The in-game **ONLINE (LAN)** screen still works: while
hosting, its short LAN code points at the host server, and a direct LAN connection with no room is routed
to the hosted room (never for tunnelled traffic). Firewalls: the first time, macOS/Windows may ask to allow
incoming connections for the app. Allow it on private networks.

## What was verified on this machine (macOS 26, arm64)

See the MSV1-HOST report. In short:
- LAN route: verified end to end (real desktop app host + real browser joiner + second desktop instance).
- Tunnel route: the full code path (spawn, URL parse, restart with new URL, kill on stop) is tested
  against a stub cloudflared. A real quick tunnel was **not deliberately tested**: running the downloaded
  binary was blocked by the session's permission policy. One unintended few-second real run did occur (see
  the report).
- UPnP: implemented and unit-shaped, but **not exercised against a real router** (it would change router
  settings without the owner present).
