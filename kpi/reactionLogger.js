import { db } from "./database.js";

export async function handleReaction(reaction, user) {
  try {
    await db.query(
      `INSERT INTO reaction_logs(userid, timestamp) VALUES($1, $2)`,
      [user.id, new Date()]
    );
  } catch (err) {
    console.error("reactionLogger エラー:", err);
  }
}
