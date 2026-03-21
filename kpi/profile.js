import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js"
import { db } from "./database.js"

export async function initProfileTable() {
  await db.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS message_id TEXT`).catch(()=>{})
  await db.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS channel_id TEXT`).catch(()=>{})
  await db.query(`CREATE TABLE IF NOT EXISTS profiles (userid TEXT PRIMARY KEY, name TEXT, diagnosis TEXT, hobbies TEXT, consideration TEXT, free_comment TEXT, auto_show BOOLEAN DEFAULT FALSE, message_id TEXT, channel_id TEXT, updated_at TIMESTAMP DEFAULT NOW())`)
  console.log("💜 profiles テーブル初期化完了")
}

export function buildProfileEmbed(profile, member) {
  const displayName = member?.displayName ?? profile.name ?? profile.userid
  const avatarURL = member?.displayAvatarURL({ size: 256 }) ?? null
  const embed = new EmbedBuilder().setColor(0x9b59b6).setTitle(`${displayName} さんのプロフィール`).addFields(
    { name: "名前", value: profile.name || "（未設定）" },
    { name: "診断名/入場条件", value: profile.diagnosis || "（未設定）" },
    { name: "趣味", value: profile.hobbies || "（未設定）" },
    { name: "配慮して欲しい事", value: profile.consideration || "（未設定）" },
    { name: "自由に一言", value: profile.free_comment || "（未設定）" }
  ).setTimestamp()
  if (avatarURL) embed.setThumbnail(avatarURL)
  return embed
}

function buildButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("profile_edit").setLabel("作成").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("profile_show").setLabel("表示").setStyle(ButtonStyle.Secondary)
  )
}

export async function profilePanelCommand(message) {
  try {
    await message.reply({
      content: "💜 **Profile**\n・「作成」ボタンでプロフィール作成\n・「表示」ボタンでプレビューを確認",
      components: [buildButtons()]
    })
  } catch (err) {
    console.error("!profile エラー:", err)
  }
}

export async function handleProfileInteraction(interaction) {
  if (interaction.isButton()) {
    if (interaction.customId === "profile_edit") {
      try {
        const existing = await getProfile(interaction.user.id) ?? {}
        const modal = new ModalBuilder().setCustomId("profile_modal").setTitle("プロフィール作成・編集")
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("name").setLabel("名前").setStyle(TextInputStyle.Short).setMaxLength(32).setRequired(true).setValue(existing.name || "")),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("diagnosis").setLabel("診断名 / 入場条件").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(false).setValue(existing.diagnosis || "")),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("hobbies").setLabel("趣味").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(false).setValue(existing.hobbies || "")),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("consideration").setLabel("配慮して欲しい事").setStyle(TextInputStyle.Paragraph).setMaxLength(200).setRequired(false).setValue(existing.consideration || "")),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("free_comment").setLabel("自由に一言").setStyle(TextInputStyle.Paragraph).setMaxLength(200).setRequired(false).setValue(existing.free_comment || ""))
        )
        await interaction.showModal(modal)
      } catch (err) {
        console.error("profile_edit エラー:", err)
      }
      return true
    }

    if (interaction.customId === "profile_show") {
      try {
        const profile = await getProfile(interaction.user.id)
        if (!profile) {
          await interaction.reply({ content: "💜 プロフィールがまだ登録されていません。「作成」ボタンから作成してください。", ephemeral: true })
          return true
        }
        let member = null
        try { member = await interaction.guild.members.fetch(interaction.user.id) } catch {}
        await interaction.reply({ embeds: [buildProfileEmbed(profile, member)], ephemeral: true })
      } catch (err) {
        console.error("profile_show エラー:", err)
      }
      return true
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === "profile_modal") {
    try {
      const userId = interaction.user.id
      const name = interaction.fields.getTextInputValue("name")
      const diagnosis = interaction.fields.getTextInputValue("diagnosis")
      const hobbies = interaction.fields.getTextInputValue("hobbies")
      const consideration = interaction.fields.getTextInputValue("consideration")
      const free_comment = interaction.fields.getTextInputValue("free_comment")
      await db.query(`INSERT INTO profiles (userid, name, diagnosis, hobbies, consideration, free_comment, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT (userid) DO UPDATE SET name=$2, diagnosis=$3, hobbies=$4, consideration=$5, free_comment=$6, updated_at=NOW()`, [userId, name, diagnosis, hobbies, consideration, free_comment])
      const profile2 = await getProfile(userId)
      let member2 = null
      try { member2 = await interaction.guild.members.fetch(userId) } catch {}
      await interaction.reply({ embeds: [buildProfileEmbed(profile2, member2)], ephemeral: false })
    } catch (err) {
      console.error("profile_modal エラー:", err)
      await interaction.reply({ content: "エラーが発生しました。", ephemeral: true }).catch(()=>{})
    }
    return true
  }

  return false
}

const PANEL_CHANNEL_ID = "1462608428039016703"
let pinnedPanelMessageId = null

export async function initPinnedPanel(client) {
  const channel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null)
  if (!channel) return
  try {
    const messages = await channel.messages.fetch({ limit: 20 })
    const old = messages.filter(m => m.author.id === client.user.id)
    for (const m of old.values()) await m.delete().catch(() => {})
  } catch {}
  await sendPinnedPanel(channel)
}

async function sendPinnedPanel(channel) {
  const msg = await channel.send({
    content: "💜 **Profile**\n・「作成」ボタンでプロフィール作成\n・「表示」ボタンでプレビューを確認",
    components: [buildButtons()]
  }).catch(() => null)
  if (msg) pinnedPanelMessageId = msg.id
}

export async function handlePinnedPanelRefresh(message) {
  if (message.channelId !== PANEL_CHANNEL_ID) return
  if (message.author.bot) return
  const channel = message.channel
  if (pinnedPanelMessageId) {
    await channel.messages.delete(pinnedPanelMessageId).catch(() => {})
    pinnedPanelMessageId = null
  }
  setTimeout(() => sendPinnedPanel(channel), 500)
}

async function getProfile(userId) {
  const res = await db.query("SELECT * FROM profiles WHERE userid=$1", [userId])
  return res.rows[0] ?? null
}
