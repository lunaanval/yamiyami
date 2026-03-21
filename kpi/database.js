import { initProfileTable } from "./profile.js";
import pg from "pg";
const { Pool } = pg;

export const db = new Pool({
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  port:     process.env.DB_PORT
});

export async function initDB(){

  await db.query(`CREATE TABLE IF NOT EXISTS message_logs(
    id SERIAL PRIMARY KEY,
    userid TEXT,
    username TEXT,
    content TEXT,
    timestamp TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS voice_logs(
    id SERIAL PRIMARY KEY,
    userid TEXT,
    jointime TIMESTAMP,
    leavetime TIMESTAMP,
    duration INT
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS users(
    userId      TEXT PRIMARY KEY,
    username    TEXT,
    joinDate    TIMESTAMP,
    inviteCode  TEXT,
    inviterId   TEXT,
    inviterName TEXT
  )`);

  // リアクションログ
  await db.query(`CREATE TABLE IF NOT EXISTS reaction_logs(
    id        SERIAL PRIMARY KEY,
    userid    TEXT,
    timestamp TIMESTAMP
  )`);

  // メンバー入退会ログ
  await db.query(`CREATE TABLE IF NOT EXISTS member_events(
    id        SERIAL PRIMARY KEY,
    userid    TEXT,
    username  TEXT,
    type      TEXT,
    timestamp TIMESTAMP
  )`);

  await initProfileTable();
  console.log("💜 DB初期化完了");
}
