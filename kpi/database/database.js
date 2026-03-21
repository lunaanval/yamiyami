export function startDashboard(client) {

  const CHANNEL_ID = process.env.DASHBOARD_CHANNEL_ID;
  let messageId = null;

  async function update() {

    const guild = client.guilds.cache.first();
    if (!guild) return;

    await guild.members.fetch();

    const memberCount = guild.memberCount;

    const onlineCount = guild.members.cache.filter(
      m => m.presence && m.presence.status !== "offline"
    ).size;

    const text =
`👥メンバー : ${memberCount}
🟢オンライン : ${onlineCount}`;

    const channel = guild.channels.cache.get(CHANNEL_ID);
    if (!channel) return;

    if (!messageId) {

      const messages = await channel.messages.fetch({ limit: 10 });

      const botMsg = messages.find(
        m => m.author.id === client.user.id
      );

      if (botMsg) {
        messageId = botMsg.id;
        await botMsg.edit(text);
      } else {
        const msg = await channel.send(text);
        messageId = msg.id;
      }

    } else {

      const msg = await channel.messages.fetch(messageId);
      if (msg) await msg.edit(text);

    }

  }

  setInterval(update, 30000);
  update();

}