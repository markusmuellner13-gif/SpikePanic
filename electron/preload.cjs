const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  activateAchievement: (id) => ipcRenderer.invoke('steam:activate-achievement', id),
  getSteamUsername: () => ipcRenderer.invoke('steam:get-username'),
  platform: process.platform,
  isSteam: process.env.STEAM_APPID != null,
});
