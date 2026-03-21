import { Client, GatewayIntentBits, AuditLogEvent } from "discord.js";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const db = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  database: process.env.DB_NAME     || "kpidb",
  user:     process.env.DB_USER     || "kpiuser",
  password: process.env.DB_PASS,
  port:     process.env.DB_PORT     || 5432,
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

client.once("clientReady", async () => {
  console.log(`ログイン成功💜 ${client.user.tag}`);

  const guild = client.guilds.cache.first();
  if (!guild) {
    console.error("サーバーが見つかりません");
    process.exit(1);
  }

  console.log("監査ログを取得中... (時間がかかる場合があります)");

  // 招待コードと招待者のマップを作成
  const inviteMap = new Map(); // userId -> { inviteCode, inviterName }

  let before = undefined;
  let total  = 0;

  // 監査ログを全件取得（100件ずつ）
  while (true) {
    const logs = await guild.fetchAuditLogs({
      type:  AuditLogEvent.MemberAdd,
      limit: 100,
      before,
    });

    if (logs.entries.size === 0) break;

    logs.entries.forEach(entry => {
      const userId     = entry.target?.id;
      const inviteCode = entry.changes?.find(c => c.key === "code")?.new ?? null;
      const inviter    = entry.executor;

      if (userId && !inviteMap.has(userId)) {
        inviteMap.set(userId, {
          inviteCode:  inviteCode,
          invitername: inviter?.tag ?? null,
          inviterid:   inviter?.id  ?? null,
        });
      }
    });

    before = logs.entries.last()?.id;
    total += logs.entries.size;
    console.log(`取得済み: ${total}件`);

    if (logs.entries.size < 100) break;

    // レート制限対策
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`監査ログ取得完了💜 対象: ${inviteMap.size}人`);

  // DBに反映
  let updated = 0;
  for (const [userId, data] of inviteMap) {
    const result = await db.query(`
      UPDATE users
      SET invitecode  = COALESCE(invitecode, $1),
          invitername = COALESCE(invitername, $2),
          inviterid   = COALESCE(inviterid, $3)
      WHERE userid = $4
        AND invitecode IS NULL
    `, [data.inviteCode, data.invitername, data.inviterid, userId]);

    if (result.rowCount > 0) updated++;
  }

  console.log(`DB更新完了💜 ${updated}人分を反映しました`);

  // 結果確認
  const check = await db.query(`
    SELECT invitecode, invitername, COUNT(*) as count
    FROM users
    WHERE invitecode IS NOT NULL
    GROUP BY invitecode, invitername
    ORDER BY count DESC
  `);

  console.log("\n💜 招待コード別 流入数:");
  check.rows.forEach(row => {
    console.log(`  ${row.invitecode} (${row.invitername ?? "不明"}) : ${row.count}人`);
  });

  await db.end();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
