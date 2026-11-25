# Multiverse Smash on a friend's PC — MAX mode

## 3 steps

1. **Install Node.js** (one time): go to <https://nodejs.org>, download the **LTS** version, and run the installer with the default options.
   Chrome or Edge should already be installed. Every Windows PC has Edge.
2. **Copy the whole game folder** to the PC (USB stick or download). Keep all the files together.
3. **Double-click the launcher:**
   - Windows: `PLAY_MAX.bat`
   - Mac: `PLAY_MAX.command` (the first time, right-click it and choose **Open**)
   - Linux: `./play_max.sh`

A console window opens and shows the hardware it found, then the game opens in its own window. On the first start the game spends about 3 seconds benchmarking the PC, then picks a quality tier: **Low, Medium, High, Ultra or MAX**. Keep the console window open while you play. Closing the game window also stops the launcher.

## In the game

| Key | What it does |
|---|---|
| **Shift+F7** | Performance panel: the hardware it detected, the tier, every quality setting, Re-run benchmark, **MAX EVERYTHING**, screenshots |
| **F7** | Live FPS and frame-time graph |
| **F** | Fullscreen |

There is also a **⚡ PERFORMANCE** button at the top left of the Settings screen and the main menu.

To launch straight into fullscreen, run `node PLAY_MAX.mjs --fullscreen`. Press Alt+F4 to quit.
To force a tier, run `node PLAY_MAX.mjs --tier=max`.

## Can this hurt the computer?

No. Software can't damage a CPU or GPU, because both have their own temperature and power protection built in. The game also adds its own limits:

- It never draws faster than the screen's refresh rate, and it never runs a busy loop.
- It sleeps when the window is minimised or hidden.
- A safety governor watches every frame. If frames start to be missed, or the system reports heavy load or heat, it lowers quality right away. It only raises quality again slowly, after a long run of smooth frames.
- On a laptop running on battery, quality is capped at Medium until it is plugged in.

## What "max" actually changes

- **Resolution:** the game is drawn at the screen's native resolution, up to 4K and above. MAX also supersamples on top of that for smoother edges.
- **Effects:** all of them are on, including particles, atmosphere fog and grading, hit effects, anime effects and weather.
- **Frame rate:** the fight stays locked at 60 fps on every screen. The engine moves the game logic and animation forward together once per frame, and online play and replays depend on that. On a 144 Hz or 240 Hz monitor, each frame is shown the moment it's ready, which keeps input lag as low as possible.

## Troubleshooting

- **"Node.js is not installed"**: complete step 1, then double-click the launcher again.
- **The game opens in a normal browser tab:** Chrome or Edge wasn't found. The game still works, just without the GPU launch flags.
- **The game feels choppy:** open the panel with Shift+F7. The governor has probably already lowered the quality. You can also pick a lower tier yourself.
- **Starting over:** delete the `.msmash-browser-profile` folder. It holds only the game's own browser settings.
