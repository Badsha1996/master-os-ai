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
}

export interface LoadModelResponse {
  status: string
  acceleration: 'GPU' | 'CPU' | 'None'
  gpu_layers: number
}

export interface HealthResponse {
  status: string
  model_loaded: boolean
  acceleration: string
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
  acceleration: string
  gpu_layers: number
}

export interface PredictResponse {
  text: string
  acceleration: string
}

export interface InitializeResponse {
  status: 'loaded' | 'already_loaded' | 'deferred'
  acceleration?: string
}

export interface ChatResponse {
  response: string
  tokens_generated: number
  time_ms: number
  acceleration: string
}

export interface ChatStatusResponse {
  service: string
  rust_server: string
  model_loaded: boolean
  acceleration: string
  ready: boolean
  error?: string
}

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, data?: any) => Promise<any>
      on: (channel: string, callback: (data: any) => void) => () => void
      removeAllStreamListeners: () => void

      agent: {
        run: (task: string) => Promise<AgentRunResponse>
        loadModel: (gpuLayers?: number) => Promise<LoadModelResponse>
        unloadModel: () => Promise<{ status: string }>
        checkHealth: () => Promise<HealthResponse>
        getMetrics: () => Promise<MetricsResponse>
        getStatus: () => Promise<LLMStatusResponse>
        predict: (
          prompt: string,
          maxTokens?: number,
          temperature?: number,
        ) => Promise<PredictResponse>
        initialize: (gpuLayers?: number, coldStart?: boolean) => Promise<InitializeResponse>
      }

      chat: {
        sendMessage: (
          text: string,
          temperature?: number,
          maxTokens?: number,
        ) => Promise<ChatResponse>
        stream: (
          text: string,
          temperature?: number,
          maxTokens?: number,
          onChunk?: (chunk: string) => void,
        ) => Promise<void>
        getStatus: () => Promise<ChatStatusResponse>
      }

      files: {
        openFolder: () => Promise<string[]>
      }
    }
  }
}

export {}
