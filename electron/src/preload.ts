import { contextBridge, ipcRenderer } from "electron";
const allowedInvokeChannels: string[] = ["ai:request", "ai:cancel"];
const allowedOnChannels: string[] = ["ai:response", "ai:status"];

contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (channel: string, data?: any) => {
    if (!allowedInvokeChannels.includes(channel)) {
      throw new Error("Invalid IPC invoke channel");
    }
    return ipcRenderer.invoke(channel, data);
  },

  on: (channel: string, callback: (data: any) => void) => {
    if (!allowedOnChannels.includes(channel)) {
      throw new Error("Invalid IPC on channel");
    }
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});



