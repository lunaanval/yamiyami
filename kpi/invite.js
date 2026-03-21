import { db } from "./database.js";
import { AttachmentBuilder } from "discord.js";
import pkg from "@napi-rs/canvas";
const { createCanvas, GlobalFonts } = pkg;

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

async function buildInviteImage(rows, title) {
  const CARD_W = 460;
  const CARD_H = 80;
  const PAD_X  = 20;
  const PAD_Y  = 90;
  const GAP_X  = 16;
  const GAP_Y  = 10;
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

  const maxCount = Number(rows[0]?.count) || 1;

  for (let i = 0; i < rows.length; i++) {
    const row   = rows[i];
    const col   = i < half ? 0 : 1;
    const rowI  = i < half ? i : i - half;
    const x     = PAD_X + col * (CARD_W + GAP_X);
    const y     = PAD_Y + rowI * (CARD_H + GAP_Y);
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

    const barX  = x + 50;
    const barW  = CARD_W - 170;
    const barH  = 10;
    const barY  = y + CARD_H / 2 - barH / 2;
    const ratio = count / maxCount;
    ctx.fillStyle = "#f0d6e8";
    roundRect(ctx, barX, barY, barW, barH, 5);
    ctx.fill();
    ctx.fillStyle = "#f7a8c4";
    roundRect(ctx, barX, barY, barW * ratio, barH, 5);
    ctx.fill();

    ctx.fillStyle = "#333333";
    ctx.font = "bold 18px LINESeed";
    const name = row.displayname ?? "不明";
    ctx.fillText(name.length > 10 ? name.slice(0, 10) + "…" : name, barX, y + CARD_H / 2 - 10);

    ctx.fillStyle = "#f7a8c4";
    ctx.font = "bold 22px LINESeed";
    ctx.textAlign = "right";
    ctx.fillText(`${count}人`, x + CARD_W - 10, y + CARD_H / 2 + 8);
    ctx.textAlign = "left";
  }

  return canvas.toBuffer("image/png");
}

async function buildRetentionImage(rows, title) {
  const CARD_W = 460;
  const CARD_H = 80;
  const PAD_X  = 20;
  const PAD_Y  = 90;
  const GAP_X  = 16;
  const GAP_Y  = 10;
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

  for (let i = 0; i < rows.length; i++) {
    const row      = rows[i];
    const col      = i < half ? 0 : 1;
    const rowI     = i < half ? i : i - half;
    const x        = PAD_X + col * (CARD_W + GAP_X);
    const y        = PAD_Y + rowI * (CARD_H + GAP_Y);
    const total    = Number(row.total);
    const retained = Number(row.retained);
    const rate     = total === 0 ? 0 : (retained / total) * 100;
    const rateStr  = rate.toFixed(1);
    const emoji    = rate >= 70 ? "S" : rate >= 40 ? "A" : "B";

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

    const name = row.displayname ?? "不明";
    ctx.fillStyle = "#333333";
    ctx.font = "bold 18px LINESeed";
    ctx.fillText(name.length > 10 ? name.slice(0, 10) + "…" : name, x + 50, y + 28);

    ctx.fillStyle = "#aaaaaa";
    ctx.font = "14px LINESeed";
    ctx.fillText(`流入 ${total}人　定着 ${retained}人`, x + 50, y + 50);

    const barX = x + 50;
    const barW = CARD_W - 130;
    const safeRate = isNaN(rate) ? 0 : Math.min(Math.max(rate, 0), 100);
    const barH = 8;
    const barY = y + 65;
    ctx.fillStyle = "#f0d6e8";
    roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fill();
    ctx.fillStyle = rate >= 70 ? "#7bc67e" : rate >= 40 ? "#f7d07a" : "#f7a8c4";
    roundRect(ctx, barX, barY, barW * (safeRate / 100), barH, 4);
    ctx.fill();

    ctx.font = "bold 20px LINESeed";
    ctx.textAlign = "right";
    ctx.fillStyle = "#555555";
    ctx.fillText(`${emoji} ${rateStr}%`, x + CARD_W - 10, y + 50);
    ctx.textAlign = "left";
  }

  return canvas.toBuffer("image/png");
}

function filterToTop20(dbRows, guild) {
  const result = [];
  for (const row of dbRows) {
    if (result.length >= 20) break;
    if (!row.inviterid) continue;
    const member = guild.members.cache.get(row.inviterid);
    if (!member) continue;
    result.push({ ...row, displayname: member.displayName });
  }
  return result;
}

export async function inviteCommand(message) {
  try {
    await message.channel.sendTyping();

    const result = await db.query(`
      SELECT inviteCode, MAX(inviterName) AS inviterName, MAX(inviterId) AS inviterId, COUNT(*) AS count
      FROM users
      WHERE inviteCode IS NOT NULL
      GROUP BY inviteCode
      ORDER BY count DESC
      LIMIT 200
    `);
    if (result.rows.length === 0) return message.reply("💜 招待データがありません。");

    const rows = filterToTop20(result.rows, message.guild);
    if (rows.length === 0) return message.reply("💜 表示できる招待データがありません。");

    const buf = await buildInviteImage(rows, `招待コード別 流入人数 TOP${rows.length}`);
    return message.reply({ files: [new AttachmentBuilder(buf, { name: "invite.png" })] });
  } catch (err) {
    console.error("!invite エラー:", err);
    return message.reply("エラーが発生しました💜");
  }
}

export async function inviteRetentionCommand(message) {
  try {
    await message.channel.sendTyping();

    const result = await db.query(`
      SELECT
        inviteCode,
        MAX(inviterId) AS inviterId,
        MAX(inviterName) AS inviterName,
        COUNT(*) AS total,
        SUM(CASE WHEN first7_count >= 3 THEN 1 ELSE 0 END) AS retained
      FROM (
        SELECT u.userId, u.inviteCode, u.inviterId, u.inviterName, COUNT(m.id) AS first7_count
        FROM users u
        LEFT JOIN message_logs m
          ON u.userId = m.userId
         AND m.timestamp BETWEEN u.joinDate AND u.joinDate + INTERVAL '7 days'
        GROUP BY u.userId, u.inviteCode, u.inviterId, u.inviterName
      ) sub
      WHERE inviteCode IS NOT NULL
      GROUP BY inviteCode
      ORDER BY total DESC
      LIMIT 200
    `);
    if (result.rows.length === 0) return message.reply("💜 招待データがありません。");

    const rows = filterToTop20(result.rows, message.guild);
    if (rows.length === 0) return message.reply("💜 表示できる招待データがありません。");

    const buf = await buildRetentionImage(rows, `招待コード別 7日定着率 TOP${rows.length}`);
    return message.reply({ files: [new AttachmentBuilder(buf, { name: "invite_retention.png" })] });
  } catch (err) {
    console.error("!inviteRetention エラー詳細:", err?.message, err?.stack);
    return message.reply("エラーが発生しました💜");
  }
}
