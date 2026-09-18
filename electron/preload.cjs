const { contextBridge, ipcRenderer } = require('electron');

/**
 * ALCO Content Engine Preload Script
 * Exposes secure IPC bridge for native desktop capabilities (such as Windows MachineGuid Device ID)
 * without exposing raw Node.js or Windows registry access to the renderer.
 */
const bridgeApi = {
  getDeviceId: () => ipcRenderer.invoke('alco:get-device-id'),
  isElectron: true,
  platform: process.platform,
};

contextBridge.exposeInMainWorld('alcoBridge', bridgeApi);
contextBridge.exposeInMainWorld('electronAPI', bridgeApi);
