import { Client, GatewayIntentBits } from "discord.js";
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

  // Discord APIから現在の招待コード一覧を取得
  const invites = await guild.invites.fetch();

  console.log("\n💜 Discord上の招待コード一覧:\n");
  console.log("コード         | 招待者          | 使用数 | 最大");
  console.log("---------------|-----------------|--------|------");

  invites.forEach(inv => {
    const code     = inv.code.padEnd(14);
    const inviter  = (inv.inviter?.tag ?? "不明").padEnd(16);
    const uses     = String(inv.uses ?? 0).padEnd(7);
    const maxUses  = inv.maxUses === 0 ? "無制限" : String(inv.maxUses);
    console.log(`${code} | ${inviter} | ${uses}| ${maxUses}`);
  });

  // DBの現状と比較
  const dbResult = await db.query(`
    SELECT invitecode, invitername, COUNT(*) as count
    FROM users
    WHERE invitecode IS NOT NULL
    GROUP BY invitecode, invitername
    ORDER BY count DESC
  `);

  console.log("\n💜 DB上の招待コード別流入数:\n");
  dbResult.rows.forEach(row => {
    console.log(`  ${row.invitecode} (${row.invitername ?? "不明"}) : ${row.count}人`);
  });

  // 使用数が多い順に表示して手動で紐付けできるよう提示
  console.log("\n💜 推測マッピング（使用数順）:\n");
  const sorted = [...invites.values()].sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0));
  sorted.forEach(inv => {
    console.log(`招待コード: ${inv.code} | 招待者: ${inv.inviter?.tag ?? "不明"} | 使用数: ${inv.uses ?? 0}人`);
  });

  console.log("\n上記の使用数をもとに、以下のSQLで一括更新できます:");
  sorted.forEach(inv => {
    console.log(`-- ${inv.code} (${inv.inviter?.tag ?? "不明"}, ${inv.uses}人)`);
    console.log(`UPDATE users SET invitecode = '${inv.code}', invitername = '${inv.inviter?.tag ?? "不明"}' WHERE userid IN (/* 対象のuserId */);`);
  });

  await db.end();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
