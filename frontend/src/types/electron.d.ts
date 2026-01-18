// electron.d.ts or types/electron.ts

// ===================== Agent Types =====================
export interface AgentStep {
  thought: string
  action: {
    name: string
    input: string
  }
  observation: string
}

export interface AgentRunResponse {
  result: string
  steps: AgentStep[]
  error?: string
}

export interface LoadModelResponse {
  status: string
  acceleration: 'GPU' | 'CPU' | 'None'
  gpu_layers: number
}

export interface HealthResponse {
  api: string
  llm: {
    loaded: boolean
    acceleration: string
  }
  ready: boolean
}

export interface MetricsResponse {
  total_requests: number
  total_tokens_generated: number
  total_time_ms: number
  average_tokens_per_request: number
  average_time_per_request_ms: number
}

export interface LLMStatusResponse {
  is_loaded: boolean
  acceleration: 'GPU' | 'CPU' | 'None'
  gpu_layers: number
}

export interface PredictResponse {
  text: string
  acceleration: 'GPU' | 'CPU' | 'None'
}

export interface InitializeResponse {
  status: string
  message: string
}

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
export interface FileSearchResponse {
  files: string[]
  total_indexed: number
  indexing_status: 'Ready' | 'indexing'
}
// ===================== Electron API Interface =====================
export interface ElectronAPI {
  invoke: (channel: string, data?: any) => Promise<any>
  on: (channel: string, callback: (data: any) => void) => () => void

  // Agent API
  agent: {
    run: (task: string) => Promise<AgentRunResponse>
    loadModel: (gpuLayers?: number) => Promise<LoadModelResponse>
    unloadModel: () => Promise<{ status: string }>
    checkHealth: () => Promise<HealthResponse>
    getMetrics: () => Promise<MetricsResponse>
    getStatus: () => Promise<LLMStatusResponse>
    predict: (prompt: string, maxTokens?: number, temperature?: number) => Promise<PredictResponse>
    initialize: (gpuLayers?: number, coldStart?: boolean) => Promise<InitializeResponse>
  }

  // Chat API
  chat: {
    sendMessage: (text: string, temperature?: number, maxTokens?: number) => Promise<ChatResponse>
    stream: (
      text: string,
      temperature?: number,
      maxTokens?: number,
      onChunk?: (chunk: string) => void,
    ) => Promise<void>
    getStatus: () => Promise<ChatStatusResponse>
  }

  // File System API
  files: {
    openFolder: () => Promise<string[]>;
    openItem:(path:string)=>Promise<void>;
  }
  searchBox: {
    search: (query: string) => Promise<FileSearchResponse>;
    resize:(height:number)=>Promise<void>;
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

export type Mode = 'chat' | 'agent'

export type SidebarTab = 'chat' | 'files' | 'metrics'
