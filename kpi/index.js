import "dotenv/config"

import { Client, GatewayIntentBits } from "discord.js"

import { initDB } from "./database.js"
import { startDashboard } from "./dashboard.js"
import { handleMessage } from "./messageLogger.js"
import { handleVoice } from "./voiceLogger.js"
import { handleCommands } from "./commands.js"
import { handleReaction } from "./reactionLogger.js"
import { handleMemberAdd, handleMemberRemove } from "./memberEvents.js"
import { startAutoReport } from "./report.js"
import { handleProfileInteraction, initPinnedPanel, handlePinnedPanelRefresh } from "./profile.js"
import { piendomoCommand, piendomoListCommand } from "./piendomo.js"

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ]
})

client.once("ready", async () => {
  console.log(`💜 BOT起動: ${client.user.tag}`)
  await initDB()
  startDashboard(client)
  startAutoReport(client)
  initPinnedPanel(client)
})

client.on("messageCreate", async (message) => {
  if (message.author.bot) return
  console.log("メッセージ受信:", message.content)
  await handleMessage(message)
  await handleCommands(message)
  await handlePinnedPanelRefresh(message)
})

client.on("interactionCreate", async (interaction) => {
  console.log("💜 interactionCreate発火:", interaction.type)

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "piendomo")      return piendomoCommand(interaction);
    if (interaction.commandName === "piendomo-list") return piendomoListCommand(interaction);
  }

  await handleProfileInteraction(interaction)
})

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return
  await handleReaction(reaction, user)
})

client.on("guildMemberAdd", async (member) => {
  await handleMemberAdd(member)
})

client.on("guildMemberRemove", async (member) => {
  await handleMemberRemove(member)
})

client.on("voiceStateUpdate", async (oldState, newState) => {
  await handleVoice(oldState, newState)
})

client.login(process.env.DISCORD_TOKEN)
