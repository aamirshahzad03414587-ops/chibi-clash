/** Canvas results board drawn over the frozen arena at round end. */
import { CONFIG, formatHp } from "./config.js";

export function drawResultsBoard(ctx, w, h, world) {
  const result = world.winner;
  if (!result) return;
  const roster = (result.roster || world.fighters || []).slice();
  const awards = result.awards || {};

  ctx.save();
  ctx.fillStyle = "rgba(8, 6, 12, 0.82)";
  ctx.fillRect(0, 0, w, Math.round(h * 0.78));

  const cardX = 40, cardY = 36, cardW = w - 80, cardH = Math.round(h * 0.74);
  roundRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.fillStyle = "rgba(18, 12, 20, 0.96)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255, 224, 138, 0.55)";
  ctx.stroke();

  const team = result.team;
  const teamCol = team === "rose" ? "#ff5b8a" : team === "sky" ? "#3db8ff" : "#ffe08a";
  ctx.fillStyle = "#ffe08a";
  ctx.font = "800 16px Fredoka, Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`ROUND ${result.round || 1} RESULTS`, w / 2, cardY + 28);

  const champ = awards.winner || result.mvp;
  ctx.fillStyle = teamCol;
  ctx.font = "800 44px Fredoka, Nunito, sans-serif";
  const title = team === "draw" ? "It's a draw!" : `${CONFIG.teams[team]?.name || "Team"} wins!`;
  ctx.fillText(title, w / 2, cardY + 80);

  if (champ) {
    ctx.fillStyle = "#fff";
    ctx.font = "800 28px Fredoka, Nunito, sans-serif";
    ctx.fillText(champ.nickname || "Fighter", w / 2, cardY + 118);
    ctx.font = "700 16px Nunito, sans-serif";
    ctx.fillStyle = CONFIG.teams[champ.team]?.color || "#fff";
    ctx.fillText(
      `${(champ.team || "").toUpperCase()}  ·  ${formatHp(champ.hp)} HP  ·  ${champ.kos || 0} KO${(champ.kos||0)===1?"":"s"}`,
      w / 2,
      cardY + 144
    );
  }

  ctx.fillStyle = "#ffe8c8";
  ctx.font = "700 15px Nunito, sans-serif";
  ctx.fillText(
    `Rose ${result.roseSurvivors} in / ${formatHp(result.roseHp)} HP     vs     Sky ${result.skySurvivors} in / ${formatHp(result.skyHp)} HP`,
    w / 2,
    cardY + 172
  );

  // Awards row
  const awardList = [
    ["Most KOs", awards.mostKos, (f) => `${f.kos} KO${f.kos===1?"":"s"}`],
    ["Best Comeback", awards.bestComeback, (f) => `${f.comebacks} comeback${f.comebacks===1?"":"s"}`],
    ["Iron Wall", awards.ironWall, (f) => `${f.blocks} block${f.blocks===1?"":"s"}`],
    ["Survivor", awards.survivor, (f) => `${formatHp(f.hp)} HP`],
  ].filter((row) => row[1]);
  const awY = cardY + 196;
  const awW = Math.min(220, (cardW - 40) / Math.max(1, awardList.length));
  awardList.forEach((row, i) => {
    const cx = cardX + 28 + i * awW + awW / 2;
    ctx.fillStyle = "rgba(255, 224, 138, 0.12)";
    roundRect(ctx, cx - awW / 2 + 6, awY, awW - 12, 58, 10);
    ctx.fill();
    ctx.fillStyle = "#ffe08a";
    ctx.font = "800 11px Fredoka, sans-serif";
    ctx.fillText(row[0].toUpperCase(), cx, awY + 16);
    ctx.fillStyle = "#fff";
    ctx.font = "800 16px Nunito, sans-serif";
    ctx.fillText(row[1].nickname || "", cx, awY + 36);
    ctx.fillStyle = "#c8c0d0";
    ctx.font = "700 12px Nunito, sans-serif";
    ctx.fillText(row[2](row[1]), cx, awY + 52);
  });

  // Ranked table — two columns of 15
  const ranked = roster.slice().sort((a, b) => {
    const as = (a.dead || a.state === "ko" || a.hp <= 0) ? 0 : 1;
    const bs = (b.dead || b.state === "ko" || b.hp <= 0) ? 0 : 1;
    return bs - as || (b.kos || 0) - (a.kos || 0) || (b.damageDealt || 0) - (a.damageDealt || 0) || (b.hp || 0) - (a.hp || 0);
  });
  const tableY = awY + 76;
  ctx.font = "800 11px Nunito, sans-serif";
  ctx.fillStyle = "#ffe08a";
  const colW = (cardW - 50) / 2;
  const headers = ["#", "Name", "Team", "KOs", "Dmg", "Status"];
  const xs = [0, 28, 130, 188, 228, 278];
  for (let c = 0; c < 2; c++) {
    const ox = cardX + 24 + c * (colW + 8);
    ctx.textAlign = "left";
    headers.forEach((hd, i) => ctx.fillText(hd, ox + xs[i], tableY));
  }
  ctx.font = "700 13px Nunito, sans-serif";
  const rowH = 26;
  ranked.forEach((f, i) => {
    const c = i < 15 ? 0 : 1;
    const r = i < 15 ? i : i - 15;
    if (r > 14) return;
    const ox = cardX + 24 + c * (colW + 8);
    const y = tableY + 20 + r * rowH;
    if (r % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(ox - 4, y - 14, colW - 4, rowH);
    }
    const survived = !f.dead && f.state !== "ko" && (f.hp || 0) > 0;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(String(i + 1), ox + xs[0], y);
    ctx.fillText(String(f.nickname || "Fighter").slice(0, 10), ox + xs[1], y);
    ctx.fillStyle = CONFIG.teams[f.team]?.color || "#fff";
    ctx.fillText((f.team || "").toUpperCase(), ox + xs[2], y);
    ctx.fillStyle = "#fff";
    ctx.fillText(String(f.kos || 0), ox + xs[3], y);
    ctx.fillText(formatHp(f.damageDealt || 0), ox + xs[4], y);
    ctx.fillStyle = survived ? "#6fe07a" : "#f08a8a";
    ctx.fillText(survived ? "In" : "KO", ox + xs[5], y);
  });

  const left = world.roundTimeLeft ? world.roundTimeLeft() : 0;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "700 15px Nunito, sans-serif";
  ctx.fillText(`Next round in ${Math.max(1, Math.ceil(left))}…`, w / 2, cardY + cardH - 18);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
