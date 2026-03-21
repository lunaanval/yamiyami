import "dotenv/config";
import { REST, Routes, ApplicationCommandType } from "discord.js";

const commands = [
  {
    name: "piendomo",
    description: "ぴえんどもの仲間入り",
    type: ApplicationCommandType.ChatInput,
  },
  {
    name: "piendomo-list",
    description: "ぴえんどもメンバー一覧を表示",
    type: ApplicationCommandType.ChatInput,
  }
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
const clientId = (await rest.get(Routes.currentApplication())).id;
await rest.put(Routes.applicationCommands(clientId), { body: commands });
console.log("✅ スラッシュコマンド登録完了");
