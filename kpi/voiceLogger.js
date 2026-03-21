import { db } from "./database.js";
const voiceSessions = new Map();
export async function handleVoice(oldState, newState) {
  // VC参加
  if (!oldState.channelId && newState.channelId) {
    voiceSessions.set(newState.id, new Date());
    await db.query(
      `
      INSERT INTO voice_logs(userid, jointime)
      VALUES($1, $2)
      `,
      [newState.id, new Date()]
    );
  }
  // VC退出
  if (oldState.channelId && !newState.channelId) {
    const joinTime = voiceSessions.get(oldState.id);
    voiceSessions.delete(oldState.id);
    const leaveTime = new Date();
    const duration = joinTime
      ? Math.floor((leaveTime - joinTime) / 1000)
      : 0;
    await db.query(
      `
      UPDATE voice_logs
      SET leavetime=$1, duration=$2
      WHERE id = (
        SELECT id FROM voice_logs
        WHERE userid=$3 AND leavetime IS NULL
        ORDER BY jointime DESC
        LIMIT 1
      )
      `,
      [leaveTime, duration, oldState.id]
    );
  }
}