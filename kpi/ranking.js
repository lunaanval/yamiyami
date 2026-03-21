import { db } from "./database.js";
import { AttachmentBuilder } from "discord.js";
import pkg from "@napi-rs/canvas";
const { createCanvas, GlobalFonts, loadImage } = pkg;

GlobalFonts.registerFromPath("./fonts/LINESeedJP-Regular.ttf", "LINESeed");

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function buildRankingImage(guild, rows, title) {
  const CARD_W = 460;
  const CARD_H = 90;
  const PAD_X  = 20;
  const PAD_Y  = 90;
  const GAP_X  = 16;
  const GAP_Y  = 12;
  const half   = Math.ceil(rows.length / 2);
  const W      = PAD_X * 2 + CARD_W * 2 + GAP_X;
  const H      = PAD_Y + half * (CARD_H + GAP_Y) + 20;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  ctx.fillStyle = "#fdf0f5";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#f7a8c4";
  ctx.fillRect(0, 0, W, 72);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px LINESeed";
  ctx.fillText(title, 20, 48);

  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  ctx.font = "16px LINESeed";
  ctx.textAlign = "right";
  ctx.fillText(`${now} JST`, W - 16, 48);
  ctx.textAlign = "left";

  const maxCount = Number(rows[0].count) || 1;

  for (let i = 0; i < rows.length; i++) {
    const row   = rows[i];
    const col   = i < half ? 0 : 1;
    const row_i = i < half ? i : i - half;
    const x     = PAD_X + col * (CARD_W + GAP_X);
    const y     = PAD_Y + row_i * (CARD_H + GAP_Y);
    const count = Number(row.count);

    ctx.fillStyle = "#ffffff";
    roundRect(ctx, x, y, CARD_W, CARD_H, 14);
    ctx.fill();

    if (i < 3) {
      const rankColor = i === 0 ? "#e8a0bf" : i === 1 ? "#b0b0b0" : "#c8a96e";
      ctx.fillStyle = rankColor;
      ctx.beginPath();
      ctx.arc(x + 22, y + CARD_H / 2, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 17px LINESeed";
      ctx.textAlign = "center";
      ctx.fillText(`${i + 1}`, x + 22, y + CARD_H / 2 + 6);
      ctx.textAlign = "left";
    } else {
      ctx.fillStyle = "#aaaaaa";
      ctx.font = "bold 18px LINESeed";
      ctx.fillText(`${i + 1}`, x + 14, y + CARD_H / 2 + 7);
    }

    const member    = guild.members.cache.get(row.userid);
    const avatarURL = member?.user.displayAvatarURL({ extension: "png", size: 64 }) ?? null;
    const avatarX   = x + 48;
    const avatarY   = y + (CARD_H - 52) / 2;
    if (avatarURL) {
      try {
        const img = await loadImage(avatarURL);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + 26, avatarY + 26, 26, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, avatarX, avatarY, 52, 52);
        ctx.restore();
      } catch (_) {}
    }

    const displayName = member?.displayName ?? row.username;
    const cleanName = displayName.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}]/gu, "").trim();
    const name = cleanName.length > 10 ? cleanName.slice(0, 10) + "…" : cleanName;
    ctx.fillStyle = "#333333";
    ctx.font = "bold 22px LINESeed";
    ctx.fillText(`${name}  ${count}回`, x + 110, y + 32);

    const barW = CARD_W - 118;
    const barX = x + 110;
    const barY = y + 56;
    ctx.fillStyle = "#f0f0f0";
    roundRect(ctx, barX, barY, barW, 10, 5);
    ctx.fill();
    const progress = Math.max(count / maxCount, 0.02);
    ctx.fillStyle = "#f7a8c4";
    roundRect(ctx, barX, barY, barW * progress, 10, 5);
    ctx.fill();
  }

  return canvas.toBuffer("image/png");
}

async function fetchRanking(days) {
  if (days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return db.query(`
      SELECT userid, username, COUNT(*) AS count
      FROM message_logs
      WHERE timestamp >= $1
      GROUP BY userid, username
      ORDER BY count DESC
      LIMIT 20
    `, [since]);
  } else {
    return db.query(`
      SELECT userid, username, COUNT(*) AS count
      FROM message_logs
      GROUP BY userid, username
      ORDER BY count DESC
      LIMIT 20
    `);
  }
}

export async function rankingCommand(message) {
  try {
    const typing = await message.reply("💜 生成中...");
    const result = await fetchRanking(30);
    if (result.rows.length === 0) return typing.edit("💜 データがありません。");
    const buf = await buildRankingImage(message.guild, result.rows, "発言ランキング（月間）");
    await typing.edit({ content: "", files: [new AttachmentBuilder(buf, { name: "ranking.png" })] });
  } catch (err) {
    console.error("!ranking エラー:", err);
    await message.reply("エラーが発生しました💜");
  }
}

export async function ranking7Command(message) {
  try {
    const typing = await message.reply("💜 生成中...");
    const result = await fetchRanking(7);
    if (result.rows.length === 0) return typing.edit("💜 データがありません。");
    const buf = await buildRankingImage(message.guild, result.rows, "発言ランキング（7日間）");
    await typing.edit({ content: "", files: [new AttachmentBuilder(buf, { name: "ranking_7.png" })] });
  } catch (err) {
    console.error("!ranking 7 エラー:", err);
    await message.reply("エラーが発生しました💜");
  }
}

export async function rankingAllCommand(message) {
  try {
    const typing = await message.reply("💜 生成中...");
    const result = await fetchRanking(null);
    if (result.rows.length === 0) return typing.edit("💜 データがありません。");
    const buf = await buildRankingImage(message.guild, result.rows, "発言ランキング（累計）");
    await typing.edit({ content: "", files: [new AttachmentBuilder(buf, { name: "ranking_all.png" })] });
  } catch (err) {
    console.error("!ranking all エラー:", err);
    await message.reply("エラーが発生しました💜");
  }
}
