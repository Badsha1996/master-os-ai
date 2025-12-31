import type {
  AgentRunResponse,
  LoadModelResponse,
  HealthResponse,
  MetricsResponse,
  LLMStatusResponse,
  PredictResponse,
  InitializeResponse,
  ChatResponse,
  ChatStatusResponse,
  FileEvent,
} from '../types/electron'

// Add new types for file watching
interface StartWatchResponse {
  status: string
  watcher_id: string
  folder: string
}

interface StopWatchResponse {
  status: string
}

interface GetEventsResponse {
  events: FileEvent[]
}

class APIService {
  private api = window.electronAPI

  // **************************** AGENT API **************************
  async runAgent(task: string): Promise<AgentRunResponse> {
    return this.api.agent.run(task)
  }

  /**
   * Load the LLM model with specified GPU layers
   * @param gpuLayers - Number of layers to offload to GPU (99 = all, 0 = CPU only)
   */
  async loadModel(gpuLayers: number = 99): Promise<LoadModelResponse> {
    return this.api.agent.loadModel(gpuLayers)
  }

  /**
   * Unload the LLM model from memory
   */
  async unloadModel(): Promise<{ status: string }> {
    return this.api.agent.unloadModel()
  }

  /**
   * Check LLM health and model status
   */
  async checkLLMHealth(): Promise<HealthResponse> {
    return this.api.agent.checkHealth()
  }

  /**
   * Get LLM usage metrics and statistics
   */
  async getMetrics(): Promise<MetricsResponse> {
    return this.api.agent.getMetrics()
  }

  /**
   * Get current LLM client status (local state)
   */
  async getLLMStatus(): Promise<LLMStatusResponse> {
    return this.api.agent.getStatus()
  }

  /**
   * Direct prediction bypassing agent logic
   */
  async predictDirect(
    prompt: string,
    maxTokens: number = 1024,
    temperature: number = 0.1,
  ): Promise<PredictResponse> {
    return this.api.agent.predict(prompt, maxTokens, temperature)
  }

  /**
   * Initialize the LLM client
   * @param gpuLayers - Number of GPU layers to use
   * @param coldStart - If true, loads model immediately. If false, defers to first use.
   */
  async initializeLLM(
    gpuLayers: number = 99,
    coldStart: boolean = true,
  ): Promise<InitializeResponse> {
    return this.api.agent.initialize(gpuLayers, coldStart)
  }

  // ****************************** CHAT API ******************************
  /**
   * Send a chat message and receive a response
   */
  async streamChatMessage(text: string, onChunk: (chunk: string) => void) {
    window.electronAPI.removeAllStreamListeners()

    return new Promise<void>(async (resolve, reject) => {
      let finished = false

      const cleanup = () => {
        if (finished) return
        finished = true
        removeData()
        removeError()
        removeEnd()
      }

      const removeData = window.electronAPI.on('ai:stream-data', (data) => {
        if (data?.type === 'chunk' && typeof data.text === 'string') {
          onChunk(data.text)
        }

        if (data?.type === 'done') {
          cleanup()
          resolve()
        }
      })

      const removeError = window.electronAPI.on('ai:stream-error', (err) => {
        cleanup()
        reject(new Error(err?.error || 'Stream error'))
      })

      const removeEnd = window.electronAPI.on('ai:stream-end', () => {
        cleanup()
        resolve()
      })

      try {
        await window.electronAPI.chat.stream(text)
      } catch (e) {
        cleanup()
        reject(e)
      }
    })
  }

  /**
   * Get chat service status
   */
  async getChatStatus(): Promise<ChatStatusResponse> {
    return this.api.chat.getStatus()
  }

  /**
   * Cancel all ongoing chat operations
   */
  async cancelChat(): Promise<{ status: string; cancelled: number }> {
    return this.api.invoke('ai:request', {
      endpoint: '/api/chat/cancel',
      method: 'POST',
    })
  }

  // **************************** FILE SYSTEM API ****************************

  /**
   * Open folder selection dialog
   */
  async openFolderDialog(): Promise<string[]> {
    return this.api.files.openFolder()
  }

  /**
   * Start watching a folder for file system changes
   */
  async startWatchingFolder(folderPath: string): Promise<StartWatchResponse> {
    return this.api.invoke('ai:request', {
      endpoint: '/api/file/observe/start',
      method: 'POST',
      body: { path: folderPath },
    })
  }

  /**
   * Stop watching a folder
   */
  async stopWatchingFolder(watcherId: string): Promise<StopWatchResponse> {
    return this.api.invoke('ai:request', {
      endpoint: `/api/file/observe/${watcherId}/stop`,
      method: 'POST',
    })
  }

  /**
   * Get file system events for a watched folder
   */
  async getFileEvents(watcherId: string): Promise<GetEventsResponse> {
    return this.api.invoke('ai:request', {
      endpoint: `/api/file/observe/${watcherId}/events`,
      method: 'GET',
    })
  }

  // **************************** HEALTH CHECKS ****************************

  /**
   * overall system health
   */
  async checkSystemHealth(): Promise<{
    chat: ChatStatusResponse
    agent: LLMStatusResponse
    overall: 'healthy' | 'degraded' | 'unhealthy'
  }> {
    try {
      const [chatStatus, agentStatus] = await Promise.all([
        this.getChatStatus(),
        this.getLLMStatus(),
      ])

      const overall =
        chatStatus.ready && agentStatus.is_loaded
          ? 'healthy'
          : chatStatus.ready || agentStatus.is_loaded
            ? 'degraded'
            : 'unhealthy'

      return {
        chat: chatStatus,
        agent: agentStatus,
        overall,
      }
    } catch (error) {
      console.error('System health check failed:', error)
      return {
        chat: {
          service: 'offline',
          rust_server: 'unavailable',
          model_loaded: false,
          acceleration: 'None',
          ready: false,
          error: String(error),
        },
        agent: {
          is_loaded: false,
          acceleration: 'None',
          gpu_layers: 0,
        },
        overall: 'unhealthy',
      }
    }
  }

  // ************************ UTILITY METHODS ************************

  /**
   * Auto-initialize system on startup
   */
  async autoInitialize(gpuLayers: number = 99): Promise<void> {
    try {
      console.log('Auto-initializing system...')
      await this.initializeLLM(gpuLayers, false)
      console.log('System initialized successfully')
    } catch (error) {
      console.error('Auto-initialization failed:', error)
      throw error
    }
  }

  /**
   * Ensure model is loaded before operation
   */
  async ensureModelLoaded(gpuLayers: number = 99): Promise<void> {
    const status = await this.getLLMStatus()
    if (!status.is_loaded) {
      console.log('Model not loaded, loading now...')
      await this.loadModel(gpuLayers)
    }
  }

  /**
   * Get acceleration emoji
   */
  getAccelerationEmoji(acceleration: string): string {
    switch (acceleration.toUpperCase()) {
      case 'GPU':
        return '🚀'
      case 'CPU':
        return '🐢'
      default:
        return '❓'
    }
  }

  /**
   * Format metrics for display
   */
  formatMetrics(metrics: MetricsResponse): Record<string, string> {
    return {
      'Total Requests': metrics.total_requests.toString(),
      'Total Tokens': metrics.total_tokens_generated.toLocaleString(),
      'Total Time': `${(metrics.total_time_ms / 1000).toFixed(2)}s`,
      'Avg Tokens/Request': metrics.average_tokens_per_request.toFixed(2),
      'Avg Time/Request': `${metrics.average_time_per_request_ms.toFixed(0)}ms`,
      'Tokens/Second': ((metrics.total_tokens_generated / metrics.total_time_ms) * 1000).toFixed(2),
    }
  }

  /**
   * Format file event type for display
   */
  formatFileEventType(eventType: string): string {
    const eventEmojis: Record<string, string> = {
      created: '📄 Created',
      deleted: '🗑️ Deleted',
      modified: '✏️ Modified',
      moved: '📦 Moved',
    }
    return eventEmojis[eventType.toLowerCase()] || `📁 ${eventType}`
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }
}

export const apiService = new APIService()
export default APIService
