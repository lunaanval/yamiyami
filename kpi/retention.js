import { db } from "./database.js";

export async function retentionCommand(message) {
  try {
    await message.channel.sendTyping();

    const result = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN first7_count >= 10 THEN 1 ELSE 0 END) AS retained_msg,
        SUM(CASE WHEN voice_duration_30 >= 3600 THEN 1 ELSE 0 END) AS retained_voice,
        SUM(CASE WHEN first7_count >= 10 OR voice_duration_30 >= 3600 THEN 1 ELSE 0 END) AS retained_total
      FROM (
        SELECT
          u.userId,
          COUNT(m.id) AS first7_count,
          COALESCE(SUM(v.duration), 0) AS voice_duration_30
        FROM users u
        LEFT JOIN message_logs m
          ON u.userId = m.userid
          AND m.timestamp BETWEEN u.joinDate AND u.joinDate + INTERVAL '7 days'
        LEFT JOIN voice_logs v
          ON u.userId = v.userid
          AND v.jointime BETWEEN u.joinDate AND u.joinDate + INTERVAL '30 days'
        WHERE u.joinDate >= NOW() - INTERVAL '30 days'
        GROUP BY u.userId
      ) sub
    `);

    const total          = Number(result.rows[0].total)          || 0;
    const retainedMsg    = Number(result.rows[0].retained_msg)   || 0;
    const retainedVoice  = Number(result.rows[0].retained_voice) || 0;
    const retainedTotal  = Number(result.rows[0].retained_total) || 0;
    const rate           = total === 0 ? 0 : ((retainedTotal / total) * 100).toFixed(1);
    const emoji          = rate >= 70 ? "🟢" : rate >= 40 ? "🟡" : "🔴";

    await message.reply(
      `${emoji} **定着率レポート（直近30日参加）**\n\n` +
      `参加者数：**${total}人**\n\n` +
      `💬 発言定着（7日以内に10回以上）：**${retainedMsg}人**\n` +
      `🎙️ 通話定着（30日以内に60分以上）：**${retainedVoice}人**\n\n` +
      `✅ 定着者合計（いずれか該当）：**${retainedTotal}人**\n` +
      `定着率：**${rate}%**`
    );
  } catch (err) {
    console.error("!retention エラー:", err);
    await message.reply("エラーが発生しました💜");
  }
}
