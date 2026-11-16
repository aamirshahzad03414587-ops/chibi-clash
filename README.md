# Chibi Clash

A cartoon fighting arena for **TikTok LIVE**. Viewers hop in as anime-chibi sticker fighters when they **like (double-tap), comment, gift, or follow**. Rounds last **five minutes**, the arena holds **30** fighters at once, and up to **80** more can reserve a seat. Everything is drawn in the browser, with squeaky miniature sound effects and no gore.

The default layout is **vertical 1080×1920** (TikTok 9:16), with a tall perspective stage and HUD kept clear of TikTok’s comment overlay (about the bottom 25%) and the right-edge buttons. Use `?landscape=1` for a 16:9, 1920×1080 layout.

Drop the page into **TikTok LIVE Studio** as a Link source, and let **TikFinity** (running beside LIVE Studio on the same computer) forward live events into the game’s WebSocket adapter. The game only *listens* for those events. It never sends likes, comments, or gifts back to TikTok.

![Chibi Clash arena preview](docs/screenshot.png)

## How viewers play

| Action | What happens |
| --- | --- |
| Like (double-tap), any comment, a gift, or a follow | Join the fight. Teams auto-balance between Rose and Sky. |
| `girl` / `boy` (or `f` / `m`, `female` / `male`) | Pick a female or male fighter look. You can also say this after you have joined. |
| Likes (once you are in) | Throw a jab (a burst of likes can come out as a cross or hook). |
| Gift | **1 coin (TikTok diamond) = +30 HP**, with no cap. Fighters grow, glow, and can earn a crown as HP stacks (size is capped so they stay readable). **Any gift** swaps boxing gloves for a shiny sword (more ornate blades for bigger gifts). 10+ coin gifts also fire a special. |
| `rose` / `sky` (or `red` / `blue`) | Pick a team. |

If the 30-person arena is full, new joiners go into the **reserve queue (80 seats)**. The HUD shows `Reserved seats 12/80` and the next few names. When a fighter is KO’d, the next reserved viewer enters. If the queue is also full, a polite **“Seats are full — thanks for watching! Please try again next round.”** message appears.

TikTok events do not include gender. If a viewer does not pick one in chat, the game makes a simple first-name guess from their nickname and otherwise picks a consistent male or female look. The keyword lists are in `js/config.js`.

## Rounds, timer, and winners

Each fight lasts **5 minutes** (`roundSeconds: 300`), with a countdown on screen. At the end — or if one team is fully wiped — a results board stays up for about **8–10 seconds**. It names the **WINNER** (name, look, team, HP), the **Rose vs Sky** team result, a ranked table of every player (KOs, damage dealt, and whether they survived), and fun awards (Most KOs, Best Comeback, Iron Wall, Survivor). The team winner is:

- the team with **more survivors**, or
- if that is tied, the team with **most HP**, or
- if only one fighter (or one team) is left, they are **last standing**

A KO is credited only to the fighter who landed the last hit. After the intermission the next round starts automatically, and **queued viewers get the first seats**. Gift HP and swords carry over only if that viewer is still present (see Fair play).

A compact **leaderboard** on the left lists top HP and top KOs for the current round.

## Run the game on your streaming PC

The game must be served from the **same computer** that runs TikTok LIVE Studio and TikFinity, so the browser source can reach TikFinity’s local WebSocket.

1. Open a terminal in this folder and start a local web server:

```bash
./start.sh
# or: python3 -m http.server 8080
```

2. On that same PC, open [http://127.0.0.1:8080/](http://127.0.0.1:8080/) in a browser.

Useful URL flags:

- `http://127.0.0.1:8080/?overlay=1` — stream layout (hide the test panel until you press T). This is the default **9:16 / 1080×1920** view.
- `http://127.0.0.1:8080/?landscape=1` — optional **16:9 / 1920×1080** layout.
- `http://127.0.0.1:8080/?demo=1` — start with a small demo crowd.
- `http://127.0.0.1:8080/?ws=ws://127.0.0.1:21213/` — override the TikFinity WebSocket URL.
- `http://127.0.0.1:8080/?mute=1` — start muted.

## Test panel (press T)

Press **T** to open the simulator (the hint is also printed faintly on the game). It is only for you — it creates *local* fake events and never talks to TikTok.

- Fake like / follow
- Comment `girl` or `boy`
- Gifts of **1 / 10 / 100** coins
- **Add 110 viewers** (fills the 30-person arena and the 80 reserve seats)
- **End round now**
- Volume and mute (the **M** key also mutes)

Volume and mute are saved in the browser.

## Add the game in TikTok LIVE Studio (Link source)

You already stream from a computer with TikTok LIVE Studio. The game is a web page, so it goes in as a **Link** source (TikTok’s name for a browser/web page source; some versions may label it **Browser**).

1. Start the local server above and keep that terminal open while you stream.
2. Open **TikTok LIVE Studio** and select the scene you go live with.
3. Click **Add source** (under the scene / sources list).
4. Choose **Link**.
5. Paste your game URL:
   - Portrait (recommended for TikTok): `http://127.0.0.1:8080/?overlay=1`
   - Landscape: `http://127.0.0.1:8080/?overlay=1&landscape=1`
6. Set a custom size that matches the layout:
   - **1080 × 1920** for the default vertical game (set your LIVE Studio canvas to 9:16 / 1080×1920 as well).
   - **1920 × 1080** only if you are using `?landscape=1`.
7. Place and scale the source on the canvas so it fills the frame. The join hint sits just above the bottom 25%, and the right edge is kept relatively clear, so TikTok’s comment list and side buttons do not cover the timer, scores, or fighters.
8. Rename the source to something like `Chibi Clash`.
9. Confirm the preview is animating. If the source is blank, double-check the server is still running and that the URL uses `http://127.0.0.1:8080/` (not `https`).

Rehearse with the test panel (**T**), set volume, then close it (T again) or use `?overlay=1` before you go live.

## Forward live events with TikFinity

TikTok LIVE Studio draws the game, but it does not hand the game your chat, likes, or gifts. **[TikFinity](https://tikfinity.zerody.one/)** runs next to LIVE Studio on the same computer and rebroadcasts those events on a local WebSocket that Chibi Clash already listens to.

1. Install and open the **TikFinity Desktop** app from [tikfinity.zerody.one](https://tikfinity.zerody.one/).
2. Complete TikFinity’s setup and connect the TikTok account you go live with.
3. Leave TikFinity open the whole time you are live (minimized is fine).
4. On TikFinity’s **Event API** page, confirm the WebSocket endpoint is:

   `ws://localhost:21213/`

   (This is the default. Chibi Clash connects to `ws://127.0.0.1:21213/` automatically.)
5. Go live in TikTok LIVE Studio as usual. TikFinity works **alongside** LIVE Studio — you do not replace LIVE Studio with OBS for this setup.
6. The test panel’s status chip (press T) should read **TikFinity connected**. Then like, comment, gift, or follow: a fighter with your nickname should appear.

If the status stays on “reconnecting”:

- Make sure TikFinity Desktop is running on the **same PC** as the game and LIVE Studio.
- Confirm nothing else has taken port `21213`.
- Reopen the game Link source so the page can reconnect.
- Keep using a local `http://127.0.0.1` URL. A remotely hosted `https://` page may be blocked from opening `ws://127.0.0.1`.

Gift streaks are counted once, when the streak ends, so a held Rose does not grant HP twelve times.

## Sounds

Hit, punch, KO, and join cues are **generated in the browser** with the Web Audio API: high-pitched formant “voices” and blips, in a funny miniature / chipmunk style. There is no copyrighted audio to license. Use the volume slider or mute (**M**) if you already have stream alerts from TikFinity.

## Looks and weapons

Fighters are **whole-body pose frames** in an anime-chibi sticker style (original art, not a copy of the reference): a big round illustrated head, glossy eyes, blush, layered hair, thick ink lines, and a white die-cut outline. Each look has a 16-pose sheet (idle bounce, dash, jab, straight punch, high kick, jumping kick, block, lean-back, hit reaction, launch, KO with swirl eyes, sword stance, overhead slash, thrust, and victory). Gloves and swords are drawn as part of the pose, not attached later. Four fully drawn looks (2 female, 2 male) plus hue-shifted variants fill out 4 female + 4 male. Females wear a blazer and skirt (brown bob or black twintails). Males wear a suit and tie (brown hair or black spikes).

- **Free players** (likes, comments, follows) fight in **boxing gloves**: jab, flick, cross, hook, uppercut, gut punch, side kick, sweep, roundhouse, hook kick, double kick, axe kick, block, parry, and dodge. Combos use a burst rhythm (a short flurry, a pause, then a heavy) rather than even 1-2-3 timing.
- **Gifters** get a **shiny sword** the moment they send any gift, plus a short team-color aura and afterimages. The blade has a gleam and a glowing swing trail; bigger gifts make it more ornate. Sword users slash, thrust, spin-slash, parry, and clash with cartoon sparks (no blood or gore).

## Combat feel

Front duels are authored, frame-based exchanges with a clear wind-up, strike, and hold on contact. Fighters step in so a fist, foot, or blade tip actually reaches the opponent; the impact spark sits on that contact point, and both fighters share a short hit-stop. The defender reacts on the same frame (head snap, body fold, stagger, or a launch with dust). Pairs take turns — one attacks, the other reacts, then a short beat before the next move — at about one attack every 1.2–2 seconds, with an occasional 3-hit burst that still shows each reaction. A subtle squash/stretch is applied to the whole sticker; bodies are never split into limbs. KOs get a far launch with bounce and tumble, plus cartoon swirl eyes and stars. No gore. Frame data lives in `js/config.js`. Authored demo and live combo sequences live in `js/combos.js` so they can be retimed without touching the renderer.

A 30-second vertical capture of the front-duel choreography is at `/workspace/chibi-clash-demo3.mp4` (1080×1920, 30 fps). The first ~22 seconds stay on Aisha vs Hamza (charge, blocked side kick, punch flurry, slow-mo parry, hook kick, gut-punch shockwave launch, sword gift and evades, blade clash, cross-counter, comeback aura dash, double kick, axe kick, finisher KO). The last stretch pulls back to a busy arena. A contact sheet is at `docs/demo3-sheet.png`.

Live play runs as a **30-fighter arena**: 15 simultaneous duels in staggered rows, all the same consistent larger size, each with a large high-contrast name tag and HP bar. The board stays fully locked and still — no camera punch-ins, zoom, or screen shake in the live arena. Impact effects stay local (sparks, shockwave rings, per-pair hit-stop). Highlights are a small banner, never a moving board. Leaderboard and queue panels stay fixed too. Hit-stop is per-fighter so one KO does not freeze the rest of the arena. A 20–25 second capture of all 30 fighting, then the results board, is at `/workspace/chibi-clash-v5.mp4` (1080×1920, 30 fps, with audio). Stills are at `docs/v5-arena.png`, `docs/v5-results.png`, and `docs/v5-impacts.png`.

Core moves for the f2 and m2 looks (and their hue variants) use **4–6 frame in-between clips** — anticipation, wind-up, strike, impact hold, follow-through, recovery — played with 24fps-style holds on the 60Hz tick (about 2–3 ticks per drawing, longer hold on the impact frame). Looks that do not yet have a clip (f1/m1 and their aliases) still snap between the 16 key poses. A side-by-side of three reference silhouettes vs our clip frames is at `docs/ref-compare.png`.

## Fair play

Chibi Clash is built so everyone in the LIVE can have a good fight, whether they hopped in with a like or sent a gift.

- **Swords** add reach and style. Their damage is capped at about **+15%** over the matching glove move, so a blade does not auto-win.
- **Glove fighters** start attacks a little sooner and have a higher chance to dodge or counter a sword swing.
- **Gift HP** still stacks at 1 coin = +30 HP with no cap, but incoming damage scales up as max HP grows, so a huge bar can still be worn down.
- After a free player is hit **three times in a row**, they get a guaranteed counter window.
- **Likes and comments** grant a short, capped speed boost, so staying in the chat matters even without coins.
- **Matchmaking** pairs fighters of similar HP when possible, and never piles several fighters onto one target.
- A **KO** is credited only to the fighter who landed the last hit.
- The results board calls out the winner plus **Most KOs**, **Best Comeback**, **Iron Wall** (most blocks), and **Survivor**, so more people get a shout-out.
- **Gift HP and swords carry over** to the next round only if that viewer is still present: seated in the arena, waiting in the reserve queue, or they liked, commented, gifted, or joined during the last round or within about **two minutes** before the new round starts. If they have left or gone inactive, they start the next round at base HP with gloves. Returning fighters show a small **HP carried over** badge. Incoming damage scaling and similar-HP matchmaking still apply, so a carried-over bar does not make the next fight one-sided.

On-screen copy stays neutral — no gambling or pay-to-win wording.

## Project layout

```
index.html          Game page
css/style.css       HUD, queue, timer, winner, test panel
js/config.js        Arena size, queue, round length, coin HP, frame data
js/gender.js        Comment picks + first-name fallback
js/audio.js         Chipmunk SFX, volume, mute
js/tikfinity.js     WebSocket adapter for TikFinity events
js/combat.js        Move state machine
js/fighter.js       AI, rows, weapons, HP scale / glow / crown
js/frames.js        Pose-frame mapping and whole-sprite squash/stretch
js/anims.js         Legacy clip names (moves still map through here)
js/combos.js        Authored front-duel sequences (edit timings here)
js/director.js      Plays those sequences on a featured pair
js/art.js           Whole-body pose drawing, auras, afterimages, nameplates
js/sprites.js       Loads packed pose sheets, frames.json, and multi-frame clips.json
js/pairs.js         Per-duel choreography directors for the 30-fighter arena
js/frames.js        Pose + clip playback (24fps-style holds on 60Hz)
assets/poses/       Aligned pose sheets + frame anchors
js/fair.js          Damage caps, comeback windows, presence / HP carry-over
js/results.js       Canvas results board (winner, awards, ranked table)
js/world.js         Arena, queue, rounds, hits, locked live camera, FX
js/ui.js            Test panel (T) and HUD
js/main.js          Game loop
tools/record-demo3.mjs  Headless 1080×1920 / 30 fps front-duel demo capture
tools/record-arena30.mjs Earlier 22s capture of the 30-fighter arena
tools/record-v5.mjs Headless 20–25s capture with audio (fight + results)
docs/screenshot.png Vertical mid-round (1080×1920: gloves and swords in the fight)
docs/winner.png     Winner screen at the end of a round
docs/demo3-sheet.png Contact sheet of the demo3 front duel
docs/arena30.png     Wide still of all 30 fighting
docs/v5-arena.png    Locked wide board with all 30 fighting
docs/v5-results.png  Round-end results board
docs/v5-impacts.png  Three close-up impact frames
docs/ref-compare.png Three reference frames vs our clip frames
```

![Winner screen](docs/winner.png)

![Character close-up](docs/closeup.png)
