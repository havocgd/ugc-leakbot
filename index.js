// --- Web server for Koyeb health checks ---
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('UGC Leak Bot is alive!'));
app.listen(3000, () => console.log('Web server running on port 3000'));

// --- Discord bot setup ---
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

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

// --- UGC scraper ---
async function scrapeUGCDetails(catalogUrl) {
  try {
    const res = await fetch(catalogUrl);
    const html = await res.text();

    const nameMatch = html.match(/<title>(.*?) - Roblox<\/title>/);
    const priceMatch = html.match(/"priceInRobux":(\d+)/);
    const timerMatch = html.match(/"remaining":(\d+)/);
    const thumbMatch = html.match(/"ThumbnailUrl":"(https:\/\/tr.rbxcdn.com\/[^"]+)/);

    const name = nameMatch ? nameMatch[1] : "Unknown Item";
    const price = priceMatch ? `${priceMatch[1]} Robux` : "Free";
    const timer = timerMatch ? `${Math.floor(timerMatch[1] / 60)} minutes left` : "No timer";
    const thumbnail = thumbMatch ? thumbMatch[1].replace(/\\u0026/g, '&') : null;

    return { name, price, timer, thumbnail };
  } catch (err) {
    console.error("Scrape failed:", err);
    return null;
  }
}

// --- Webhook message listener ---
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.webhookId) return;

  console.log("Webhook message received:", msg.content);

  if (
    msg.content.includes("roblox.com/catalog/") &&
    msg.content.toLowerCase().includes("limited")
  ) {
    console.log("✅ UGC limited detected:", msg.content);

    const match = msg.content.match(/https:\/\/www\.roblox\.com\/catalog\/\d+/);
    if (!match) return;

    const catalogUrl = match[0];
    const details = await scrapeUGCDetails(catalogUrl);
    if (!details) return;

    const embed = new EmbedBuilder()
      .setTitle(`🔥 ${details.name}`)
      .setDescription(`💸 ${details.price}\n⏳ ${details.timer}`)
      .setURL(catalogUrl)
      .setColor(0xff4757)
      .setTimestamp();

    if (details.thumbnail) embed.setImage(details.thumbnail);

    msg.channel.send({ embeds: [embed] });
  }
});

try {
  client.login(process.env.DISCORD_TOKEN);
} catch (err) {
  console.error("❌ Login failed:", err);
}
