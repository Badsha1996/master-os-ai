import { contextBridge, ipcRenderer } from "electron";

const allowedOnChannels = [
  "ai:response",
  "ai:status",
  "ai:stream-data", 
  "ai:stream-end", 
  "ai:stream-error", 
  "ui:open-setting"
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
  // Agent API
  agent: {
    run: (task: string) => Promise<any>;
    loadModel: (gpuLayers?: number) => Promise<any>;
    unloadModel: () => Promise<any>;
    checkHealth: () => Promise<any>;
    getMetrics: () => Promise<any>;
    getStatus: () => Promise<any>;
    predict: (
      prompt: string,
      maxTokens?: number,
      temperature?: number
    ) => Promise<any>;
    initialize: (gpuLayers?: number, coldStart?: boolean) => Promise<any>;
  };

  // Chat API
  chat: {
    sendMessage: (
      text: string,
      temperature?: number,
      maxTokens?: number
    ) => Promise<any>;
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

  // Agent API Methods
  agent: {
    run: (task: string) =>
      ipcRenderer.invoke("ai:request", {
        endpoint: "/api/agent/run",
        method: "POST",
        body: { task },
      }),

    loadModel: (gpuLayers = 99) =>
      ipcRenderer.invoke("ai:request", {
        endpoint: "/api/agent/llm/load",
        method: "POST",
        body: { gpu_layers: gpuLayers },
      }),

    unloadModel: () =>
      ipcRenderer.invoke("ai:request", {
        endpoint: "/api/agent/llm/unload",
        method: "POST",
      }),

    checkHealth: () =>
      ipcRenderer.invoke("ai:request", {
        endpoint: "/api/agent/llm/health",
        method: "GET",
      }),

    getMetrics: () =>
      ipcRenderer.invoke("ai:request", {
        endpoint: "/api/agent/llm/metrics",
        method: "GET",
      }),

    getStatus: () =>
      ipcRenderer.invoke("ai:request", {
        endpoint: "/api/agent/llm/status",
        method: "GET",
      }),

    predict: (prompt: string, maxTokens = 1024, temperature = 0.1) =>
      ipcRenderer.invoke("ai:request", {
        endpoint: "/api/agent/llm/predict",
        method: "POST",
        body: { prompt, max_tokens: maxTokens, temperature },
      }),

    initialize: (gpuLayers = 99, coldStart = true) =>
      ipcRenderer.invoke("ai:request", {
        endpoint: "/api/agent/llm/initialize",
        method: "POST",
        body: { gpu_layers: gpuLayers, cold_start: coldStart },
      }),
  },

  // Chat API Methods
  chat: {
    sendMessage: (text, temperature = 0.7, maxTokens = 512) =>
      ipcRenderer.invoke("ai:request", {
        endpoint: "/api/chat/text-to-text",
        method: "POST",
        body: { text, temperature, max_tokens: maxTokens },
      }),

    // This just triggers the start; the frontend must use .on() to get data
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
