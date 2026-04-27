const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { Client } = require('discord.js-selfbot-v13');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const tokensPath = path.join(__dirname, 'saved_tokens.json');
if (!fs.existsSync(tokensPath)) {
  fs.writeFileSync(tokensPath, '[]', 'utf8');
}

let discordClient = null;

app.get('/api/tokens', (req, res) => {
  try {
    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    const singleToken = Array.isArray(tokens) && tokens.length > 0 ? [tokens[0]] : [];
    res.json({ success: true, tokens: singleToken });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/tokens', (req, res) => {
  try {
    const { name, token } = req.body;
    const safeName = typeof name === 'string' && name.trim() ? name.trim() : 'Main Account';
    const singleToken = [{ name: safeName, token }];
    fs.writeFileSync(tokensPath, JSON.stringify(singleToken, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.delete('/api/tokens/:name', (req, res) => {
  try {
    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    const newTokens = tokens.filter(t => t.name !== req.params.name).slice(0, 1);
    fs.writeFileSync(tokensPath, JSON.stringify(newTokens, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/updates', async (req, res) => {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/Bherl1/DiscordAccMgr/refs/heads/main/package.json');
    const latestVersion = response.data.version;
    const currentVersion = require('./package.json').version;
    res.json({
      hasUpdate: latestVersion > currentVersion,
      version: latestVersion,
      downloadUrl: `https://github.com/Bherl1/DiscordAccMgr/releases/download/v${latestVersion}/DiscordAccManager-Setup.exe`
    });
  } catch (error) {
    res.json({ hasUpdate: false });
  }
});

app.post('/api/discord/connect', async (req, res) => {
  try {
    const { token } = req.body;
    if (discordClient) {
      await discordClient.destroy();
      discordClient = null;
    }
    discordClient = new Client({ checkUpdate: false, fetchAllMembers: false });
    await discordClient.login(token);
    res.json({ success: true, username: discordClient.user.tag });
  } catch (error) {
    console.error('Connection error:', error);
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/discord/friends', async (req, res) => {
  try {
    if (!discordClient || !discordClient.token) {
      return res.json({ success: false, error: 'Not connected to Discord' });
    }
    const response = await axios.get('https://discord.com/api/v9/users/@me/relationships', {
      headers: { 'Authorization': discordClient.token }
    });
    const friends = response.data
      .filter(r => r.type === 1)
      .map(f => ({
        id: f.user.id,
        username: f.user.username,
        displayName: f.user.global_name || f.user.username,
        avatar: f.user.avatar ? `https://cdn.discordapp.com/avatars/${f.user.id}/${f.user.avatar}.png` : '/src/icons/discord.png'
      }));
    res.json({ success: true, friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.json({ success: false, error: error.message });
  }
});

app.delete('/api/discord/friends/:friendId', async (req, res) => {
  try {
    if (!discordClient || !discordClient.token) {
      return res.json({ success: false, error: 'Not connected to Discord' });
    }
    await axios.delete(`https://discord.com/api/v9/users/@me/relationships/${req.params.friendId}`, {
      headers: { 'Authorization': discordClient.token, 'Content-Type': 'application/json' }
    });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/discord/servers', async (req, res) => {
  try {
    if (!discordClient || !discordClient.guilds) {
      return res.json({ success: false, error: 'Not connected' });
    }
    const servers = Array.from(discordClient.guilds.cache.values())
      .filter(s => s && s.ownerId !== discordClient.user.id)
      .map(s => ({ id: s.id, name: s.name, icon: s.iconURL() || '/src/icons/discord.png' }));
    res.json({ success: true, servers });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/discord/servers/:serverId/leave', async (req, res) => {
  try {
    if (!discordClient || !discordClient.guilds) {
      return res.json({ success: false, error: 'Not connected' });
    }
    const guild = discordClient.guilds.cache.get(req.params.serverId);
    if (!guild) return res.json({ success: false, error: 'Server not found' });
    await guild.leave();
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/discord/servers/:serverId/mute', async (req, res) => {
  try {
    if (!discordClient || !discordClient.token) return res.json({ success: false, error: 'Not connected' });
    await axios.patch(`https://discord.com/api/v9/users/@me/guilds/${req.params.serverId}/settings`, { muted: true }, {
      headers: { 'Authorization': discordClient.token, 'Content-Type': 'application/json' }
    });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/discord/servers/:serverId/unmute', async (req, res) => {
  try {
    if (!discordClient || !discordClient.token) return res.json({ success: false, error: 'Not connected' });
    await axios.patch(`https://discord.com/api/v9/users/@me/guilds/${req.params.serverId}/settings`, { muted: false }, {
      headers: { 'Authorization': discordClient.token, 'Content-Type': 'application/json' }
    });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/discord/servers/readall', async (req, res) => {
  try {
    if (!discordClient || !discordClient.token) return res.json({ success: false, error: 'Not connected' });
    const guilds = Array.from(discordClient.guilds.cache.values());
    for (const guild of guilds) {
      try { await guild.markAsRead(); } catch (e) { console.error(`Failed to mark ${guild.id} as read:`, e); }
    }
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/discord/dms', async (req, res) => {
  try {
    if (!discordClient || !discordClient.user) return res.json({ success: false, error: 'Not connected' });
    const dms = Array.from(discordClient.channels.cache.values())
      .filter(c => c.type === 'DM')
      .map(dm => ({
        id: dm.id,
        username: dm.recipient?.username || 'Unknown User',
        displayName: dm.recipient?.globalName || dm.recipient?.username || 'Unknown User',
        avatar: dm.recipient?.avatarURL() || '/src/icons/discord.png'
      }));
    res.json({ success: true, dms });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/discord/dms/:channelId/messages', async (req, res) => {
  try {
    if (!discordClient || !discordClient.user) return res.json({ success: false, error: 'Not connected' });
    const channel = await discordClient.channels.fetch(req.params.channelId);
    if (!channel || channel.type !== 'DM') return res.json({ success: false, error: 'Invalid DM channel' });
    const beforeId = req.query.before || null;
    const options = beforeId ? { before: beforeId, limit: 100 } : { limit: 100 };
    const messages = await channel.messages.fetch(options);
    res.json({
      success: true,
      currentUserId: discordClient.user.id,
      messages: Array.from(messages.values()).map(msg => ({
        id: msg.id,
        content: msg.content,
        isDeletable: msg.author.id === discordClient.user.id && !msg.system
      }))
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.delete('/api/discord/dms/:channelId/messages/:messageId', async (req, res) => {
  try {
    if (!discordClient || !discordClient.user) return res.json({ success: false, error: 'Not connected' });
    const channel = await discordClient.channels.fetch(req.params.channelId);
    if (!channel || channel.type !== 'DM') return res.json({ success: false, error: 'Invalid DM channel' });
    const message = await channel.messages.fetch(req.params.messageId);
    await message.delete();
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/discord/dms/:channelId/close', async (req, res) => {
  try {
    if (!discordClient || !discordClient.user) return res.json({ success: false, error: 'Not connected' });
    const channel = await discordClient.channels.fetch(req.params.channelId);
    if (!channel || channel.type !== 'DM') return res.json({ success: false, error: 'Invalid DM channel' });
    await channel.delete();
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/discord/groups', async (req, res) => {
  try {
    if (!discordClient || !discordClient.user) return res.json({ success: false, error: 'Not connected' });
    const groups = Array.from(discordClient.channels.cache.values())
      .filter(c => c.type === 'GROUP_DM')
      .map(g => ({
        id: g.id,
        name: g.name || 'Unnamed Group',
        icon: g.iconURL() || '/src/icons/discord.png',
        recipients: g.recipients.size
      }));
    res.json({ success: true, groups });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/discord/groups/:groupId/leave', async (req, res) => {
  try {
    if (!discordClient || !discordClient.user) return res.json({ success: false, error: 'Not connected' });
    const group = await discordClient.channels.fetch(req.params.groupId);
    if (!group || group.type !== 'GROUP_DM') return res.json({ success: false, error: 'Invalid group' });
    await group.delete();
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/discord/groups/:channelId/messages', async (req, res) => {
  try {
    if (!discordClient || !discordClient.token) return res.json({ success: false, error: 'Not connected' });
    const beforeId = req.query.before || null;
    const url = `https://discord.com/api/v9/channels/${req.params.channelId}/messages?limit=100${beforeId ? `&before=${beforeId}` : ''}`;
    const response = await axios.get(url, {
      headers: { 'Authorization': discordClient.token, 'Content-Type': 'application/json' }
    });
    res.json({
      success: true,
      currentUserId: discordClient.user.id,
      messages: response.data.map(msg => ({
        id: msg.id,
        content: msg.content,
        author: { id: msg.author.id }
      }))
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.delete('/api/discord/groups/:channelId/messages/:messageId', async (req, res) => {
  try {
    if (!discordClient || !discordClient.token) return res.json({ success: false, error: 'Not connected' });
    await axios.delete(`https://discord.com/api/v9/channels/${req.params.channelId}/messages/${req.params.messageId}`, {
      headers: { 'Authorization': discordClient.token, 'Content-Type': 'application/json' }
    });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Discord Account Manager running on port ${PORT}`);
});
