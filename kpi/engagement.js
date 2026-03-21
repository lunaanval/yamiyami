import { db } from "./database.js";
import pkg from "@napi-rs/canvas";
const { createCanvas, GlobalFonts, loadImage } = pkg;

GlobalFonts.registerFromPath("./fonts/LINESeedJP-Regular.ttf", "LINESeed");

// スコア計算：発言数×1 + VC時間(分)×0.5 + リアクション数×2 + 招待数×10
export async function calcEngagement(days = 30) {
  const isAll = days === null;
  const since = isAll ? new Date(0) : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await db.query(`
    SELECT
      u.userId,
      u.username,
      COALESCE(m.msg_count, 0)    AS msg_count,
      COALESCE(v.vc_minutes, 0)   AS vc_minutes,
      COALESCE(r.react_count, 0)  AS react_count,
      COALESCE(i.invite_count, 0) AS invite_count
    FROM users u
    LEFT JOIN (
      SELECT userid, COUNT(*) AS msg_count
      FROM message_logs WHERE timestamp >= $1
      GROUP BY userid
    ) m ON u.userId = m.userid
    LEFT JOIN (
      SELECT userid, COALESCE(SUM(duration)/60, 0) AS vc_minutes
      FROM voice_logs WHERE jointime >= $1
      GROUP BY userid
    ) v ON u.userId = v.userid
    LEFT JOIN (
      SELECT userid, COUNT(*) AS react_count
      FROM reaction_logs WHERE timestamp >= $1
      GROUP BY userid
    ) r ON u.userId = r.userid
    LEFT JOIN (
      SELECT inviterid, COUNT(*) AS invite_count
      FROM users WHERE joinDate >= $1 AND inviterid IS NOT NULL
      GROUP BY inviterid
    ) i ON u.userId = i.inviterid
    ORDER BY (
      COALESCE(m.msg_count, 0) * 1 +
      COALESCE(v.vc_minutes, 0) * 0.5 +
      COALESCE(r.react_count, 0) * 2 +
      COALESCE(i.invite_count, 0) * 10
    ) DESC
    LIMIT 50
  `, [since]);

  return result.rows.map(row => ({
    ...row,
    score: Math.round(
      row.msg_count * 1 +
      row.vc_minutes * 0.5 +
      row.react_count * 2 +
      row.invite_count * 10
    )
  }));
}

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

export async function engagementImage(guild, rows, title = "エンゲージメントスコア（月間）") {
  // Botと除外ユーザーとサーバーにいないユーザーを除外
  const excludedIds = new Set((process.env.EXCLUDED_USER_IDS || "").split(",").map(id => id.trim()).filter(Boolean));
  rows = rows.filter(row => {
    const member = guild.members.cache.get(row.userid);
    return member && !member.user.bot && !excludedIds.has(row.userid);
  }).slice(0, 20);

  const CARD_W = 500;
  const CARD_H = 90;
  const PAD_X  = 20;
  const PAD_Y  = 100;
  const GAP_X  = 20;
  const GAP_Y  = 16;
  const half   = Math.ceil(rows.length / 2);
  const W      = PAD_X * 2 + CARD_W * 2 + GAP_X;
  const H      = PAD_Y + half * (CARD_H + GAP_Y) + 30;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // 白背景
  ctx.fillStyle = "#fdf0f5";
  ctx.fillRect(0, 0, W, H);

  // ピンクヘッダー
  ctx.fillStyle = "#f7a8c4";
  ctx.fillRect(0, 0, W, 80);

  // タイトル
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px LINESeed";
  ctx.fillText(title, 24, 52);

  // 日時
  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  ctx.font = "20px LINESeed";
  ctx.textAlign = "right";
  ctx.fillText(`${now} JST`, W - 20, 52);
  ctx.textAlign = "left";

  const maxScore = rows[0]?.score || 1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const col = i < half ? 0 : 1;
    const r   = i < half ? i : i - half;
    const x   = PAD_X + col * (CARD_W + GAP_X);
    const y   = PAD_Y + r * (CARD_H + GAP_Y);

    // カード
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, x, y, CARD_W, CARD_H, 16);
    ctx.fill();

    // 順位
    const rankColor = i === 0 ? "#e8a0bf" : i === 1 ? "#b0b0b0" : i === 2 ? "#c8a96e" : "#888888";
    if (i < 3) {
      ctx.fillStyle = rankColor;
      ctx.beginPath();
      ctx.arc(x + 22, y + CARD_H / 2, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px LINESeed";
      ctx.textAlign = "center";
      ctx.fillText(`${i + 1}`, x + 22, y + CARD_H / 2 + 7);
      ctx.textAlign = "left";
    } else {
      ctx.fillStyle = rankColor;
      ctx.font = "bold 20px LINESeed";
      ctx.fillText(`${i + 1}`, x + 14, y + CARD_H / 2 + 8);
    }

    // アバター
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

    // 名前 + スコア
    const displayName = member?.displayName ?? row.username;
    const name = displayName.length > 12 ? displayName.slice(0, 12) + "…" : displayName;
    ctx.fillStyle = "#333333";
    ctx.font = "bold 24px LINESeed";
    ctx.fillText(`${name}  Pt${row.score}`, x + 110, y + 34);

    // 詳細
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "15px LINESeed";
    ctx.fillText(`msg:${row.msg_count}  vc:${row.vc_minutes}分  react:${row.react_count}  inv:${row.invite_count}`, x + 110, y + 56);

    // プログレスバー
    const barW = CARD_W - 120;
    const barX = x + 110;
    const barY = y + 68;
    ctx.fillStyle = "#f0f0f0";
    roundRect(ctx, barX, barY, barW, 10, 5);
    ctx.fill();
    const progress = Math.max(row.score / maxScore, 0.02);
    ctx.fillStyle = "#f7a8c4";
    roundRect(ctx, barX, barY, barW * progress, 10, 5);
    ctx.fill();
  }

  return canvas.toBuffer("image/png");
}