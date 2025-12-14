import { contextBridge, ipcRenderer } from "electron";

const allowedOnChannels: string[] = ["ai:response", "ai:status"];
const allowedInvokeChannels = [
  "ai:request",
  "ai:cancel",
  "dialog:openFolder",
] as const;

type InvokeChannel = (typeof allowedInvokeChannels)[number];

contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (channel: InvokeChannel, data?: any) => {
    if (!allowedInvokeChannels.includes(channel)) {
      throw new Error("Invalid IPC invoke channel");
    }
    return ipcRenderer.invoke(channel, data);
  },

  on: (channel: string, callback: (data: any) => void) => {
    const allowedOnChannels = ["ai:response", "ai:status"];
    if (!allowedOnChannels.includes(channel)) {
      throw new Error("Invalid IPC on channel");
    }
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
