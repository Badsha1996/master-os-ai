import { contextBridge, ipcRenderer } from "electron";

const allowedOnChannels = [
  "ai:response",
  "ai:status",
  "ai:stream-data",
  "ai:stream-end",
  "ai:stream-error",
  "ui:open-setting",
];

const allowedInvokeChannels = [
  "ai:request",
  "ai:request-stream",
  "file:search",
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
      onChunk?: (chunk: string) => void,
    ) => Promise<void>;
    getStatus: () => Promise<any>;
  };

  // File System API
  files: {
    openItem: (path: string) => Promise<void>;
  };
  searchBox: {
    search: (query: string) => Promise<string[]>;
    resize: (height: number) => Promise<void>;
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
    openItem: (path: string) => ipcRenderer.invoke("open:path", path),
  },
  searchBox: {
    search: (query: string) =>{
      return ipcRenderer.invoke("file:search", {
        endpoint: `/api/file/search`,
        method: "POST",
        query: encodeURIComponent(query)
      })},
    resize: (height: number) =>
      ipcRenderer.invoke("input:resize-window", height),
  },

  removeAllStreamListeners: () => {
    ipcRenderer.removeAllListeners("ai:stream-data");
    ipcRenderer.removeAllListeners("ai:stream-error");
    ipcRenderer.removeAllListeners("ai:stream-end");
    ipcRenderer.removeAllListeners("input:resize-window");
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
