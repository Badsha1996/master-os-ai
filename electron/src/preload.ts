import { contextBridge, ipcRenderer } from "electron";

const allowedOnChannels = [
  "ai:response",
  "ai:status",
  "ai:stream-data", 
  "ai:stream-end", 
  "ai:stream-error", 
];

const allowedInvokeChannels = [
  "ai:request",
  "ai:request-stream",
  "ai:cancel",
  "dialog:openFolder",
] as const;

type InvokeChannel = (typeof allowedInvokeChannels)[number];

export interface ElectronAPI {
  invoke: (channel: InvokeChannel, data?: any) => Promise<any>;
  on: (channel: string, callback: (data: any) => void) => () => void;


  // Chat API
  chat: {
    stream: (
      text: string,
      temperature?: number,
      maxTokens?: number,
      onChunk?: (chunk: string) => void
    ) => Promise<void>;
    getStatus: () => Promise<any>;
  };

  // File System API
  files: {
    openFolder: () => Promise<string[]>;
  };
  removeAllStreamListeners: {};
}

const electronAPI: ElectronAPI = {
  invoke: (channel: InvokeChannel, data?: any) => {
    if (!allowedInvokeChannels.includes(channel)) {
      throw new Error("Invalid IPC invoke channel");
    }
    return ipcRenderer.invoke(channel, data);
  },

  on: (channel, callback) => {
    if (!allowedOnChannels.includes(channel)) {
      throw new Error(`Invalid IPC on channel: ${channel}`);
    }
    const listener = (_event: any, data?: any) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // Chat API Methods
  chat: {
    stream: (text, temperature = 0.7, maxTokens = 512) =>
      ipcRenderer.invoke("ai:request-stream", {
        endpoint: "/api/chat/stream",
        method: "POST",
        body: { text, temperature, max_tokens: maxTokens },
      }),

    getStatus: () =>
      ipcRenderer.invoke("ai:request", {
        endpoint: "/api/chat/status",
        method: "GET",
      }),
  },

  // File System API
  files: {
    openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  },

  removeAllStreamListeners: () => {
    ipcRenderer.removeAllListeners("ai:stream-data");
    ipcRenderer.removeAllListeners("ai:stream-error");
    ipcRenderer.removeAllListeners("ai:stream-end");
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
