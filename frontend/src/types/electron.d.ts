// ===================== Chat Types =====================
export interface ChatResponse {
  response: string
  model: string
  tokens: number
  time_ms: number
}

export interface ChatStatusResponse {
  service: string
  rust_server?: string
  model_loaded: boolean
  acceleration: 'GPU' | 'CPU' | 'None'
  ready: boolean
  error?: string
}

// ===================== File System Types =====================
export interface FileEvent {
  event_type: 'created' | 'deleted' | 'modified' | 'moved'
  path: string
  timestamp: number
}

export interface StartWatchResponse {
  status: string
  watcher_id: string
  folder: string
}

export interface StopWatchResponse {
  status: string
}

export interface GetEventsResponse {
  events: FileEvent[]
}

// ===================== Electron API Interface =====================
export interface ElectronAPI {
  invoke: (channel: string, data?: any) => Promise<any>
  on: (channel: string, callback: (data: any) => void) => () => void

  // Chat API
  chat: {
    stream: (
      text: string,
      temperature?: number,
      maxTokens?: number,
      onChunk?: (chunk: string) => void
    ) => Promise<void>
    getStatus: () => Promise<ChatStatusResponse>
  }

  // File System API
  files: {
    openFolder: () => Promise<string[]>
  }

  // Utility
  removeAllStreamListeners: () => void
}

// ===================== Global Window Extension =====================
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// ===================== Additional Utility Types =====================
export interface WatchedFolder {
  id: string
  path: string
  status: 'active' | 'stopped'
  events: FileEvent[]
}

export interface ChatMessage {
  human: string
  ai: string
  loading?: boolean
  steps?: AgentStep[]
  showSteps?: boolean
  currentThinking?: string
  acceleration?: string
  tokensGenerated?: number
  timeMs?: number
}

export type Mode = 'chat' 
