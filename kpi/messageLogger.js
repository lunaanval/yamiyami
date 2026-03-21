import { db } from "./database.js";

export async function handleMessage(message){
  // コマンドは保存しない
  if (message.content.startsWith("!")) return;

  try {
    await db.query(
      `INSERT INTO message_logs(userid, username, content, timestamp)
       VALUES($1, $2, $3, $4)`,
      [message.author.id, message.author.tag, message.content, new Date()]
    );
  } catch (err) {
    console.error("messageLogger エラー:", err);
  }
}