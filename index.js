// --- Web server for Koyeb health checks ---
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('UGC Leak Bot is alive!'));
app.listen(8000, () => console.log('🌐 Web server running on port 8000'));

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

console.log("🔑 DISCORD_TOKEN:", process.env.DISCORD_TOKEN);

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('error', (err) => {
  console.error('❌ Discord client error:', err);
});

// --- UGC scraper ---
async function scrapeUGCDetails(catalogUrl) {
  console.log("🔍 Scraping catalog page:", catalogUrl);
  try {
    const res = await fetch(catalogUrl);
    const html = await res.text();

    const nameMatch = html.match(/<title>(.*?) - Roblox<\/title>/);
    const priceMatch = html.match(/"priceInRobux":(\d+)/);
    const timerMatch = html.match(/"remaining":(\d+)/);
    const thumbMatch = html.match(/"ThumbnailUrl":"(https:\/\/tr.rbxcdn.com\/[^"]+)/);

    if (!nameMatch) console.warn("⚠️ Title not found");
    if (!priceMatch) console.warn("⚠️ Price not found");
    if (!timerMatch) console.warn("⚠️ Timer not found");
    if (!thumbMatch) console.warn("⚠️ Thumbnail not found");

    const name = nameMatch ? nameMatch[1] : "Unknown Item";
    const price = priceMatch ? `${priceMatch[1]} Robux` : "Free";
    const timer = timerMatch ? `${Math.floor(timerMatch[1] / 60)} minutes left` : "No timer";
    const thumbnail = thumbMatch ? thumbMatch[1].replace(/\\u0026/g, '&') : null;

    console.log("✅ Scrape result:", { name, price, timer, thumbnail });
    return { name, price, timer, thumbnail };
  } catch (err) {
    console.error("❌ Scrape failed:", err);
    return null;
  }
}

// --- Webhook message listener ---
client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.webhookId) return;

  console.log("📨 Webhook message received:", msg.content || "[embed only]");

  const catalogRegex = /https:\/\/www\.roblox\.com\/catalog\/\d+/;
  let catalogUrl = null;

  // Check plain content
  if (msg.content && catalogRegex.test(msg.content)) {
    catalogUrl = msg.content.match(catalogRegex)[0];
    console.log("🔗 Catalog link found in content:", catalogUrl);
  }

  // Check embeds
  if (!catalogUrl && msg.embeds?.length) {
    for (const embed of msg.embeds) {
      const fields = [
        embed.title,
        embed.description,
        embed.url,
        ...(embed.fields?.map(f => f.value) || [])
      ];

      for (const field of fields) {
        if (field && catalogRegex.test(field)) {
          catalogUrl = field.match(catalogRegex)[0];
          console.log("🔗 Catalog link found in embed:", catalogUrl);
          break;
        }
      }

      if (catalogUrl) break;
    }
  }

  // Check for "limited" in content or embed description
  const mentionsLimited =
    msg.content?.toLowerCase().includes("limited") ||
    msg.embeds?.some(e => e.description?.toLowerCase().includes("limited"));

  if (catalogUrl && mentionsLimited) {
    console.log("🚨 UGC limited detected:", catalogUrl);

    const details = await scrapeUGCDetails(catalogUrl);
    if (!details) {
      console.warn("⚠️ Skipping due to scrape failure");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🔥 ${details.name}`)
      .setDescription(`💸 ${details.price}\n⏳ ${details.timer}`)
      .setURL(catalogUrl)
      .setColor(0xff4757)
      .setTimestamp();

    if (details.thumbnail) embed.setImage(details.thumbnail);

    msg.channel.send({ embeds: [embed] });
    console.log("📢 Embed posted to channel");

    // --- Log to Cloudflare KV via Worker ---
    const dropId = catalogUrl.split('/').pop();
    const logPayload = {
      id: dropId,
      name: details.name,
      price: details.price,
      timer: details.timer,
      thumbnail: details.thumbnail,
      timestamp: Date.now()
    };

    try {
      const res = await fetch("https://ugc-leak-logger.havocgdash.workers.dev/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logPayload)
      });

      const text = await res.text();
      console.log("📦 KV log response:", res.status, text);
    } catch (err) {
      console.error("❌ KV log failed:", err);
    }
  } else {
    console.log("⏸️ Message ignored
