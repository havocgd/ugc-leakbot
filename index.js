// --- Web server for Koyeb health checks ---
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('UGC Leak Bot is alive!'));
app.listen(3000, () => console.log('Web server running on port 3000'));

// --- Discord bot setup ---
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

console.log("DISCORD_TOKEN:", process.env.DISCORD_TOKEN); // Debug token injection

client.once('clientReady', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('error', (err) => {
  console.error('❌ Discord client error:', err);
});

// --- Webhook message listener ---
client.on('messageCreate', (msg) => {
  if (msg.author.bot) return;
  if (!msg.webhookId) return;

  console.log("Webhook message received:", msg.content);

  if (
    msg.content.includes("roblox.com/catalog/") &&
    msg.content.toLowerCase().includes("limited")
  ) {
    console.log("✅ UGC limited detected:", msg.content);

    const embed = new EmbedBuilder()
      .setTitle("🔥 New UGC Limited!")
      .setDescription(msg.content)
      .setColor(0xff4757)
      .setTimestamp();

    msg.channel.send({ embeds: [embed] });
  }
});

try {
  client.login(process.env.DISCORD_TOKEN);
} catch (err) {
  console.error("❌ Login failed:", err);
}
