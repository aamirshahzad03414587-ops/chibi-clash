# CHIBI CLASH (live)

A TikTok LIVE stick-fight brawler. It uses the original stickfight engine (moves, choreography, hits, ragdolls, effects, and the cinematic camera) with chibi skins on the same bones. Live events come from **TikFinity** running on the same PC.

## LIVE Studio setup
1. Install and run TikFinity, connect it to your LIVE, and leave it open. It serves events at `ws://127.0.0.1:21213/`.
2. Serve this folder. Any static host works: Render static site, GitHub Pages, or locally with `python3 -m http.server 8090`.
3. In TikTok LIVE Studio, add a **Link** source with the URL `https://<your-host>/index.html?overlay=1` and set it to **1080 x 1920**. Sound autoplays in the Link source.
4. The game connects to TikFinity by itself and reconnects with backoff (1s up to 15s). Without `?overlay=1`, a status label shows "TikFinity connected" or "waiting for TikFinity".

## Rules
- **Like or comment = join** with 50 HP. Commenting "girl" or "boy" picks your fighter; otherwise it is guessed from your nickname. Follows give no reward. Free players fight with boxing gloves.
- **Gifts: 1 coin = +30 HP** and a sword: 1+ coins steel, 10+ royal (gold), 100+ legend.
- **Fair gifts:** the HP bar shows the real numbers, but every hit you take is multiplied by `maxHp / effHp`, where `effHp = 120 x (1 + 0.6 x log2(maxHp / 120))` above 120 HP. So 1 coin (80 HP) takes normal damage. 10 coins (350 HP) is about 231 effective HP. 100 coins (3,050 HP) is about 456 effective, roughly 9 free players. 500 coins (15,050) is about 622. Swords hit like gloves (x0.72 per hit).
- **Two arenas:** A on top and B on the bottom, up to 15 fighters each and 30 in total, plus an 80-seat first-come reserved queue. New joiners and queue refills go to the arena with fewer fighters. KO'd fighters are replaced instantly, and new fighters get about 1s of spawn protection. Each arena uses the same fight engine with a calm, locked camera. Fighters only fight others in their own arena.
- **FINAL ARENA:** when the queue is empty and one arena has 2 or fewer fighters (or 8 or fewer remain in total), the screen wipes and the survivors drop into one full-screen arena. The last one standing wins; if time runs out, most HP wins at 0:00 (set `timeUpRanking` to `effective` to rank by effective HP instead).
- With fewer than 9 fighters (lobby or an early stream), the game uses one arena and his original camera. It splits automatically at 12 or more during a fight.
- FINAL RUSH in the last 30s makes hits x1.5. A capped boss drops into the busier arena about every 90s (HP 35 x fighters in that arena, between 150 and 700); KO'ing it gives +30 HP. The player with the most KOs wears the KING crown.
- No talking: no speech bubbles, no voice clips, no taunt lines. Sound is hits, whooshes, KO, crowd and short sped-up chipmunk grunts. No full-screen impact flashes.
- The results board shows the winner, placements, KOs, and awards. Gift HP and swords carry over to the next round if you are still around (fighting, queued, or active in the last 2 min).

Tuning is in `settings.json`: roundSeconds, finalRushSeconds, likeHp, giftMultiplier, maxFighters, bossEvery, bossSeconds, timeUpRanking, volume.

## URL options
`?overlay=1` hides the test UI. `?split=0` keeps one arena (no split). `?tikfinity=ws://host:port/` sets a different TikFinity URL. `?notikfinity=1` stays offline. `?round=SECONDS`, `?rush=SECONDS`, and `?boss=SECONDS` are for testing.

## Test keys (without overlay)
The panel buttons send like, comment, girl, boy, gifts (Rose 1, Doughnut 10, Hat 100, Lion 500), auto-sim, new round, and boss. Keys: **Y** girl comment, **U** boy comment, **B** boss, **X** KO someone.

## Dev
- `game.js` is generated. Edit `tools/patch.py` (patches to the original engine) and `tools/hybrid_systems.js`, then run `python3 tools/patch.py`. The original engine must be at `/workspace/stickref/game.js`.
- Tests need headless Chrome and the page served on 127.0.0.1:8090:
  - `node tools/test-113.mjs`: 30/80/3 plus the FIFO check.
  - `node tools/soak.mjs`
  - `WS_DIR=/tmp/wsenv node tools/test-tikfinity.mjs`: fake TikFinity and a 120s real-time soak; needs the `ws` npm package.
  - `node tools/record-demo2.mjs`: demo mp4 (split, refill, gift swords, merge, results).
  - `node tools/fps.mjs` (add `"&split=0"` for one arena): real-time frame rate with 30 fighters.
