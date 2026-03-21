export function helpCommand(message){
  message.reply(`
💜 **KPI BOT COMMANDS**

【発言・定着】
\`!retention\`          定着率（発言 or 通話）

【招待】
\`!invite\`             招待コード別 流入人数
\`!inviteRetention\`    招待コード別 7日定着率

【ランキング画像】
\`!ranking\`            発言ランキングTOP20（月間）
\`!ranking 7\`          発言ランキングTOP20（7日間）
\`!ranking all\`        発言ランキングTOP20（累計）

【エンゲージメント】
\`!engagement\`         スコアランキングTOP20（30日）
\`!engagement 7\`       スコアランキングTOP20（7日）

【メンバー成長分析】
\`!growth\`             成長グラフ（30日）
\`!growth 7\`           成長グラフ（7日）
\`!growth 90\`          成長グラフ（90日）

【エクスポート】
\`!export\`             全KPIをGoogleスプレッドシートに出力

【プロフィール】
\`!profile\`            ボタンパネルを表示（作成・表示）

【ぴえんども】
\`/piendomo\`           ぴえんどもロールを取得
\`/piendomo-list\`      ぴえんどもメンバー一覧を表示

📅 自動レポート: 毎日・毎週月曜・毎月1日 09:00 JST に送信
  `)
}
