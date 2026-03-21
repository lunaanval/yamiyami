import { db } from "./database.js";

export async function handleMemberAdd(member) {
  try {
    await db.query(
      `INSERT INTO member_events(userid, username, type, timestamp) VALUES($1, $2, $3, $4)`,
      [member.id, member.user.tag, "join", new Date()]
    );
  } catch (err) {
    console.error("memberAdd エラー:", err);
  }
}

export async function handleMemberRemove(member) {
  try {
    await db.query(
      `INSERT INTO member_events(userid, username, type, timestamp) VALUES($1, $2, $3, $4)`,
      [member.id, member.user.tag, "leave", new Date()]
    );
  } catch (err) {
    console.error("memberRemove エラー:", err);
  }
}
