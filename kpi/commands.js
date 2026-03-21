import { AttachmentBuilder } from "discord.js";
import { helpCommand } from "./help.js";
import { rankingCommand, ranking7Command, rankingAllCommand } from "./ranking.js";
import { retentionCommand } from "./retention.js";
import { exportCommand } from "./export.js";
import { inviteCommand, inviteRetentionCommand } from "./invite.js";
import { calcEngagement, engagementImage } from "./engagement.js";
import { growthImage } from "./growth.js";
import { profilePanelCommand } from "./profile.js";
import { piendomoCommand } from "./piendomo.js";

export async function handleCommands(message) {
  const cmd = message.content.trim();

  if (cmd === "!help")             return helpCommand(message);
  if (cmd === "!ranking all")      return rankingAllCommand(message);
  if (cmd === "!ranking 7")        return ranking7Command(message);
  if (cmd === "!ranking")          return rankingCommand(message);
  if (cmd === "!retention")        return retentionCommand(message);
  if (cmd === "!export")           return exportCommand(message);
  if (cmd === "!invite")           return inviteCommand(message);
  if (cmd === "!inviteRetention")  return inviteRetentionCommand(message);
  if (cmd === "!profile" || cmd.startsWith("!profile ")) return profilePanelCommand(message);
  if (cmd === "/piendomo")         return piendomoCommand(message);

  if (cmd === "!engagement" || cmd === "!engagement 30") {
    try {
      await message.channel.sendTyping();
      const rows = await calcEngagement(30);
      if (rows.length === 0) return message.reply("💜 データがありません。");
      const buf = await engagementImage(message.guild, rows, "エンゲージメントスコア TOP20（30日）");
      return message.reply({ files: [new AttachmentBuilder(buf, { name: "engagement.png" })] });
    } catch (err) {
      console.error("!engagement エラー:", err);
      return message.reply("エラーが発生しました💜");
    }
  }
  if (cmd === "!engagement all") {
    try {
      await message.channel.sendTyping();
      const rows = await calcEngagement(null);
      if (rows.length === 0) return message.reply("💜 データがありません。");
      const buf = await engagementImage(message.guild, rows, "エンゲージメントスコア TOP20（累計）");
      return message.reply({ files: [new AttachmentBuilder(buf, { name: "engagement.png" })] });
    } catch (err) {
      console.error("!engagement all エラー:", err);
      return message.reply("エラーが発生しました💜");
    }
  }
  if (cmd === "!engagement 7") {
    try {
      await message.channel.sendTyping();
      const rows = await calcEngagement(7);
      if (rows.length === 0) return message.reply("💜 データがありません。");
      const buf = await engagementImage(message.guild, rows, "エンゲージメントスコア TOP20（7日）");
      return message.reply({ files: [new AttachmentBuilder(buf, { name: "engagement.png" })] });
    } catch (err) {
      console.error("!engagement エラー:", err);
      return message.reply("エラーが発生しました💜");
    }
  }
  if (cmd === "!growth" || cmd === "!growth 30") {
    try {
      await message.channel.sendTyping();
      const buf = await growthImage(30);
      return message.reply({ files: [new AttachmentBuilder(buf, { name: "growth.png" })] });
    } catch (err) {
      console.error("!growth エラー:", err);
      return message.reply("エラーが発生しました💜");
    }
  }
  if (cmd === "!growth 7") {
    try {
      await message.channel.sendTyping();
      const buf = await growthImage(7);
      return message.reply({ files: [new AttachmentBuilder(buf, { name: "growth.png" })] });
    } catch (err) {
      console.error("!growth エラー:", err);
      return message.reply("エラーが発生しました💜");
    }
  }
  if (cmd === "!growth 90") {
    try {
      await message.channel.sendTyping();
      const buf = await growthImage(90);
      return message.reply({ files: [new AttachmentBuilder(buf, { name: "growth.png" })] });
    } catch (err) {
      console.error("!growth エラー:", err);
      return message.reply("エラーが発生しました💜");
    }
  }
}
