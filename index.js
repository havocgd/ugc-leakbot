// --- Web server for Koyeb health checks ---
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('UGC Leak Bot is alive!'));
app.listen(3000, () => console.log('Web server running on port 3000'));

// --- Discord bot setup ---
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('error', (err) => {
  console.error('❌ Discord client error:', err);
});

client.login(process.env.DISCORD_TOKEN);
