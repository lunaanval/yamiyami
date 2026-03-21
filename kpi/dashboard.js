export async function startDashboard(client){

  await updateDashboard(client)

  setInterval(()=>{
    updateDashboard(client)
  }, 5 * 60 * 1000)

}

export async function updateDashboard(client){

  const guild = client.guilds.cache.first()
  if(!guild) return

  await guild.members.fetch()

  const memberCount = guild.memberCount

  const onlineCount = guild.members.cache.filter(m =>
    m.presence && m.presence.status !== "offline"
  ).size

  console.log(`📊 メンバー: ${memberCount}, オンライン: ${onlineCount}`)

  // オンライン数チャンネルの名前を更新
  console.log(`🔍 ONLINE_CHANNEL_ID: ${process.env.ONLINE_CHANNEL_ID}`)
  const onlineChannel = guild.channels.cache.get(process.env.ONLINE_CHANNEL_ID)
  if(onlineChannel){
    await onlineChannel.setName(`オンライン：${onlineCount}`)
    console.log(`✅ オンラインチャンネル更新完了`)
  } else {
    console.log(`❌ オンラインチャンネルが見つかりません`)
  }

  // メンバー数チャンネルの名前を更新
  console.log(`🔍 MEMBER_CHANNEL_ID: ${process.env.MEMBER_CHANNEL_ID}`)
  const memberChannel = guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID)
  if(memberChannel){
    await memberChannel.setName(`メンバー：${memberCount}`)
    console.log(`✅ メンバーチャンネル更新完了`)
  } else {
    console.log(`❌ メンバーチャンネルが見つかりません`)
  }
}
