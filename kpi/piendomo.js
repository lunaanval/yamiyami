const PIENDOMO_ROLE_ID    = "1462591303778046158";
const PIENDOMO_CHANNEL_ID = "1453972808106250250";

export async function piendomoCommand(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const member = interaction.member;
    if (!member) return;

    await member.roles.add(PIENDOMO_ROLE_ID);

    const channel = interaction.guild.channels.cache.get(PIENDOMO_CHANNEL_ID);
    if (channel) {
      await channel.send(`🥺 ${member} ぴえんどもの仲間入りだよ！`);
    }

    await interaction.editReply("🥺 ぴえんどもの仲間入りだよ！");
  } catch (err) {
    console.error("/piendomo エラー:", err);
    await interaction.editReply("エラーが発生しました💜");
  }
}

export async function piendomoListCommand(interaction) {
  await interaction.deferReply();

  try {
    await interaction.guild.members.fetch();

    const role = interaction.guild.roles.cache.get(PIENDOMO_ROLE_ID);
    if (!role) {
      return interaction.editReply("ロールが見つかりませんでした💜");
    }

    const members = role.members.map(m => m.displayName).sort();

    if (members.length === 0) {
      return interaction.editReply("🥺 まだぴえんどものメンバーはいません。");
    }

    const list = members.map((name, i) => `${i + 1}. ${name}`).join("\n");

    await interaction.editReply(
      `🥺 **ぴえんどもメンバー一覧（${members.length}人）**\n\n${list}`
    );
  } catch (err) {
    console.error("/piendomo-list エラー:", err);
    await interaction.editReply("エラーが発生しました💜");
  }
}
