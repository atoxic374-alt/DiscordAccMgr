async function apiCall(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`/api${path}`, opts);
  return res.json();
}

window.electronAPI = {
  minimize: () => {},
  maximize: () => {},
  close: () => {},

  getTokens: () => apiCall('GET', '/tokens'),
  saveToken: (name, token) => apiCall('POST', '/tokens', { name, token }),
  deleteToken: (name) => apiCall('DELETE', `/tokens/${encodeURIComponent(name)}`),

  checkUpdates: () => apiCall('GET', '/updates'),
  downloadUpdate: (url) => { window.open(url, '_blank'); },
  openExternal: (url) => { window.open(url, '_blank'); },

  connectDiscord: (token) => apiCall('POST', '/discord/connect', { token }),
  getFriends: () => apiCall('GET', '/discord/friends'),
  deleteFriend: (friendId) => apiCall('DELETE', `/discord/friends/${friendId}`),
  getServers: () => apiCall('GET', '/discord/servers'),
  leaveServer: (serverId) => apiCall('POST', `/discord/servers/${serverId}/leave`),
  muteServer: (serverId) => apiCall('POST', `/discord/servers/${serverId}/mute`),
  unmuteServer: (serverId) => apiCall('POST', `/discord/servers/${serverId}/unmute`),
  readAll: () => apiCall('POST', '/discord/servers/readall'),
  getDMs: () => apiCall('GET', '/discord/dms'),
  getDMMessages: (channelId, beforeId) => {
    const qs = beforeId ? `?before=${beforeId}` : '';
    return apiCall('GET', `/discord/dms/${channelId}/messages${qs}`);
  },
  deleteDMMessage: (channelId, messageId) => apiCall('DELETE', `/discord/dms/${channelId}/messages/${messageId}`),
  closeDM: (channelId) => apiCall('POST', `/discord/dms/${channelId}/close`),
  getGroups: () => apiCall('GET', '/discord/groups'),
  leaveGroup: (groupId) => apiCall('POST', `/discord/groups/${groupId}/leave`),
  getGroupMessages: (channelId, beforeId) => {
    const qs = beforeId ? `?before=${beforeId}` : '';
    return apiCall('GET', `/discord/groups/${channelId}/messages${qs}`);
  },
  deleteGroupMessage: (channelId, messageId) => apiCall('DELETE', `/discord/groups/${channelId}/messages/${messageId}`),
};
