import { db } from "./database.js";
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

async function getDailyData(days = 30) {
  const result = await db.query(`
    SELECT
      DATE(timestamp AT TIME ZONE 'Asia/Tokyo') AS day,
      type,
      COUNT(*) AS count
    FROM member_events
    WHERE timestamp >= NOW() - INTERVAL '${days} days'
    GROUP BY day, type
    ORDER BY day ASC
  `);

  const map = {};
  for (const row of result.rows) {
    const d = row.day.toISOString().slice(0, 10);
    if (!map[d]) map[d] = { join: 0, leave: 0 };
    map[d][row.type] = Number(row.count);
  }

  const labels = [], joins = [], leaves = [], nets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d   = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    const j = map[key]?.join  ?? 0;
    const l = map[key]?.leave ?? 0;
    joins.push(j);
    leaves.push(l);
    nets.push(j - l);
  }
  return { labels, joins, leaves, nets };
}

export async function growthImage(days = 30) {
  const { labels, joins, leaves, nets } = await getDailyData(days);

  const W = 1060, H = 560;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // 白背景
  ctx.fillStyle = "#fdf0f5";
  ctx.fillRect(0, 0, W, H);

  // ピンクヘッダー
  ctx.fillStyle = "#f7a8c4";
  ctx.fillRect(0, 0, W, 80);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px LINESeed";
  ctx.fillText(`メンバー成長分析（直近${days}日）`, 24, 52);

  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  ctx.font = "20px LINESeed";
  ctx.textAlign = "right";
  ctx.fillText(`${now} JST`, W - 20, 52);
  ctx.textAlign = "left";

  // サマリーカード（4枚）
  const totalJoin  = joins.reduce((a, b) => a + b, 0);
  const totalLeave = leaves.reduce((a, b) => a + b, 0);
  const totalNet   = totalJoin - totalLeave;
  const churnRate  = totalJoin === 0 ? "0.0" : ((totalLeave / totalJoin) * 100).toFixed(1);

  const cards = [
    { label: "参加",    value: `+${totalJoin}人`,  color: "#f7a8c4" },
    { label: "退会",    value: `-${totalLeave}人`, color: "#f7a8c4" },
    { label: "純増",    value: `${totalNet >= 0 ? "+" : ""}${totalNet}人`, color: "#f7a8c4" },
    { label: "チャーン率", value: `${churnRate}%`, color: "#f7a8c4" },
  ];

  const cardW = 230, cardH = 70, cardY = 90;
  cards.forEach((c, i) => {
    const cx = 20 + i * (cardW + 14);
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, cx, cardY, cardW, cardH, 14);
    ctx.fill();
    ctx.fillStyle = c.color;
    ctx.font = "bold 28px LINESeed";
    ctx.fillText(c.value, cx + 16, cardY + 42);
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "16px LINESeed";
    ctx.fillText(c.label, cx + 16, cardY + 62);
  });

  // グラフエリア
  const gx = 70, gy = 192, gw = W - 90, gh = H - 240;
  const maxVal = Math.max(...joins, ...leaves, 1);
  const step   = gw / (labels.length - 1 || 1);

  // 凡例（グラフ右上）
  const legend = [
    { color: "#f7a8c4", label: "参加" },
    { color: "#e8a0bf", label: "退会" },
    { color: "rgba(247,168,196,0.5)", label: "純増バー" },
  ];
  legend.forEach((l, i) => {
    const lx = W - 320 + i * 100;
    const ly = gy - 10;
    ctx.fillStyle = l.color;
    ctx.fillRect(lx, ly - 10, 22, 10);
    ctx.fillStyle = "#888888";
    ctx.font = "14px LINESeed";
    ctx.fillText(l.label, lx + 28, ly);
  });

  // グリッド
  for (let j = 0; j <= 4; j++) {
    const ly = gy + gh - (j / 4) * gh;
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, ly);
    ctx.lineTo(gx + gw, ly);
    ctx.stroke();
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "14px LINESeed";
    ctx.textAlign = "right";
    ctx.fillText(Math.round((j / 4) * maxVal), gx - 6, ly + 5);
    ctx.textAlign = "left";
  }

  // X軸ラベル
  const skip = Math.ceil(labels.length / 10);
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "13px LINESeed";
  ctx.textAlign = "center";
  labels.forEach((label, i) => {
    if (i % skip === 0) {
      ctx.fillText(label, gx + i * step, gy + gh + 20);
    }
  });
  ctx.textAlign = "left";

  // 純増バー
  nets.forEach((v, i) => {
    const bx   = gx + i * step - 5;
    const bh   = Math.abs(v) / maxVal * gh * 0.4;
    ctx.fillStyle = v >= 0 ? "rgba(247,168,196,0.5)" : "rgba(200,150,170,0.3)";
    if (v >= 0) {
      ctx.fillRect(bx, gy + gh - bh, 10, bh);
    } else {
      ctx.fillRect(bx, gy + gh, 10, bh);
    }
  });

  // 参加ライン（ピンク）
  ctx.strokeStyle = "#f7a8c4";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  joins.forEach((v, i) => {
    const lx = gx + i * step;
    const ly = gy + gh - (v / maxVal) * gh;
    i === 0 ? ctx.moveTo(lx, ly) : ctx.lineTo(lx, ly);
  });
  ctx.stroke();

  // 退会ライン（薄ピンク破線）
  ctx.strokeStyle = "#e8a0bf";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  leaves.forEach((v, i) => {
    const lx = gx + i * step;
    const ly = gy + gh - (v / maxVal) * gh;
    i === 0 ? ctx.moveTo(lx, ly) : ctx.lineTo(lx, ly);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  return canvas.toBuffer("image/png");
}
