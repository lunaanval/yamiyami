import { AttachmentBuilder } from "discord.js";
import { engagementImage, calcEngagement } from "./engagement.js";
import { growthImage } from "./growth.js";

// 毎日 09:00 JST、毎週月曜 09:00 JST、毎月1日 09:00 JST に送信

function msUntil(targetHour, targetMin = 0) {
  const now = new Date();
  const jst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const next = new Date(jst);
  next.setHours(targetHour, targetMin, 0, 0);
  if (next <= jst) next.setDate(next.getDate() + 1);
  return next - jst;
}

export function startAutoReport(client) {

  // 毎日 09:00 JST
  function scheduleDailyReport() {
    const delay = msUntil(9, 0);
    console.log(`💜 日次レポート: ${Math.round(delay / 60000)}分後`);
    setTimeout(async () => {
      await sendDailyReport(client);
      setInterval(() => sendDailyReport(client), 24 * 60 * 60 * 1000);
    }, delay);
  }

  // 毎週月曜 09:00 JST
  function scheduleWeeklyReport() {
    function nextMonday() {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
      const day = now.getDay();
      const diff = day === 1 ? 7 : (8 - day) % 7;
      const next = new Date(now);
      next.setDate(now.getDate() + diff);
      next.setHours(9, 0, 0, 0);
      return next - now;
    }
    const delay = nextMonday();
    console.log(`💜 週次レポート: ${Math.round(delay / 60000)}分後`);
    setTimeout(async () => {
      await sendWeeklyReport(client);
      setInterval(() => sendWeeklyReport(client), 7 * 24 * 60 * 60 * 1000);
    }, delay);
  }

  // 毎月1日 09:00 JST
  function scheduleMonthlyReport() {
    function nextFirstOfMonth() {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0, 0);
      return next - now;
    }
    const delay = nextFirstOfMonth();
    console.log(`💜 月次レポート: ${Math.round(delay / 60000)}分後`);
    setTimeout(async () => {
      await sendMonthlyReport(client);
      // 翌月1日を再スケジュール
      function reschedule() {
        const d = nextFirstOfMonth();
        setTimeout(async () => { await sendMonthlyReport(client); reschedule(); }, d);
      }
      reschedule();
    }, delay);
  }

  scheduleDailyReport();
  scheduleWeeklyReport();
  scheduleMonthlyReport();
}

async function getReportChannel(client) {
  const channelId = process.env.REPORT_CHANNEL_ID;
  if (!channelId) return null;
  return client.channels.cache.get(channelId) ?? null;
}

async function sendDailyReport(client) {
  try {
    const channel = await getReportChannel(client);
    if (!channel) return console.log("❌ REPORT_CHANNEL_ID 未設定");
    const guild = client.guilds.cache.first();

    const [growthBuf, rows] = await Promise.all([
      growthImage(7),
      calcEngagement(7)
    ]);
    const engageBuf = await engagementImage(guild, rows, "エンゲージメント TOP20（7日間）");

    await channel.send({
      content: "📅 **日次レポート** 昨日のサマリーです💜",
      files: [
        new AttachmentBuilder(growthBuf,  { name: "growth_daily.png" }),
        new AttachmentBuilder(engageBuf, { name: "engagement_daily.png" }),
      ]
    });
    console.log("💜 日次レポート送信完了");
  } catch (err) {
    console.error("日次レポートエラー:", err);
  }
}

async function sendWeeklyReport(client) {
  try {
    const channel = await getReportChannel(client);
    if (!channel) return;
    const guild = client.guilds.cache.first();

    const [growthBuf, rows] = await Promise.all([
      growthImage(7),
      calcEngagement(7)
    ]);
    const engageBuf = await engagementImage(guild, rows, "エンゲージメント TOP20（週間）");

    await channel.send({
      content: "📊 **週次レポート** 今週のKPIサマリーです💜",
      files: [
        new AttachmentBuilder(growthBuf,  { name: "growth_weekly.png" }),
        new AttachmentBuilder(engageBuf, { name: "engagement_weekly.png" }),
      ]
    });
    console.log("💜 週次レポート送信完了");
  } catch (err) {
    console.error("週次レポートエラー:", err);
  }
}

async function sendMonthlyReport(client) {
  try {
    const channel = await getReportChannel(client);
    if (!channel) return;
    const guild = client.guilds.cache.first();

    const [growthBuf, rows] = await Promise.all([
      growthImage(30),
      calcEngagement(30)
    ]);
    const engageBuf = await engagementImage(guild, rows, "エンゲージメント TOP20（月間）");

    await channel.send({
      content: "🗓️ **月次レポート** 今月のKPIレポートです💜",
      files: [
        new AttachmentBuilder(growthBuf,  { name: "growth_monthly.png" }),
        new AttachmentBuilder(engageBuf, { name: "engagement_monthly.png" }),
      ]
    });
    console.log("💜 月次レポート送信完了");
  } catch (err) {
    console.error("月次レポートエラー:", err);
  }
}
