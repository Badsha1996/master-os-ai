import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiService } from '../services/api'
import type { MetricsResponse } from '../types/electron'

export function useAI() {
  const isModelLoaded = ref(false)
  const acceleration = ref<'GPU' | 'CPU' | 'None'>('None')
  const gpuLayers = ref(99)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const metrics = ref<MetricsResponse | null>(null)
  const chatReady = ref(false)
  const agentReady = ref(false)

  // ************************** COMPUTED **************************
  const accelerationEmoji = computed(() => apiService.getAccelerationEmoji(acceleration.value))

  const statusColor = computed(() => {
    if (!isModelLoaded.value) return 'red'
    if (acceleration.value === 'GPU') return 'green'
    return 'yellow'
  })

  const systemStatus = computed(() => {
    if (!isModelLoaded.value) return 'Not Loaded'
    return `${acceleration.value} ${accelerationEmoji.value}`
  })

  const isSystemReady = computed(() => chatReady.value && agentReady.value)

  // **************************** HELPERS / UTILITY FUNCTIONS ****************************

  async function refreshSystemHealth() {
    try {
      isLoading.value = true
      error.value = null

      const health = await apiService.checkSystemHealth()

      isModelLoaded.value = health.chat.model_loaded || health.agent.is_loaded
      acceleration.value = (health.chat.acceleration || health.agent.acceleration) as any
      gpuLayers.value = health.agent.gpu_layers
      chatReady.value = health.chat.ready
      agentReady.value = health.agent.is_loaded

      return health
    } catch (err) {
      error.value = String(err)
      console.error('Failed to refresh system health:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function loadModel(layers: number = 99) {
    try {
      isLoading.value = true
      error.value = null

      const result = await apiService.loadModel(layers)

      isModelLoaded.value = true
      acceleration.value = result.acceleration
      gpuLayers.value = result.gpu_layers

      await refreshSystemHealth()

      return result
    } catch (err) {
      error.value = String(err)
      console.error('Failed to load model:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function unloadModel() {
    try {
      isLoading.value = true
      error.value = null

      await apiService.unloadModel()

      isModelLoaded.value = false
      acceleration.value = 'None'
      gpuLayers.value = 0

      await refreshSystemHealth()
    } catch (err) {
      error.value = String(err)
      console.error('Failed to unload model:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function initialize(layers: number = 99, coldStart: boolean = false) {
    try {
      isLoading.value = true
      error.value = null

      await apiService.initializeLLM(layers, coldStart)
      await refreshSystemHealth()
    } catch (err) {
      error.value = String(err)
      console.error('Failed to initialize:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function fetchMetrics() {
    try {
      metrics.value = await apiService.getMetrics()
      return metrics.value
    } catch (err) {
      error.value = String(err)
      console.error('Failed to fetch metrics:', err)
      throw err
    }
  }

  const formattedMetrics = computed(() => {
    if (!metrics.value) return null
    return apiService.formatMetrics(metrics.value)
  })

  async function runAgent(task: string) {
    try {
      error.value = null
      return await apiService.runAgent(task)
    } catch (err) {
      error.value = String(err)
      console.error('Agent execution failed:', err)
      throw err
    }
  }

  async function predictDirect(
    prompt: string,
    maxTokens: number = 1024,
    temperature: number = 0.1,
  ) {
    try {
      error.value = null
      return await apiService.predictDirect(prompt, maxTokens, temperature)
    } catch (err) {
      error.value = String(err)
      console.error('Direct prediction failed:', err)
      throw err
    }
  }

  async function sendChatMessage(text: string, temperature: number = 0.7, maxTokens: number = 512) {
    try {
      error.value = null
      return await apiService.sendChatMessage(text, temperature, maxTokens)
    } catch (err) {
      error.value = String(err)
      console.error('Chat message failed:', err)
      throw err
    }
  }

  const streamChatMessage = async (text: string, onChunk: (chunk: string) => void) => {
    // 1. Clean up any stale listeners from previous crashes
    window.electronAPI.removeAllStreamListeners()

    return new Promise<void>(async (resolve, reject) => {
      // 2. Set up the "listeners"
      const removeData = window.electronAPI.on('ai:stream-data', (data) => {
        // Rust usually sends chunks in a 'text' or 'content' field
        if (data.text) onChunk(data.text)
      })

      const removeError = window.electronAPI.on('ai:stream-error', (err) => {
        cleanup()
        reject(new Error(err.error))
      })

      const removeEnd = window.electronAPI.on('ai:stream-end', () => {
        cleanup()
        resolve()
      })

      const cleanup = () => {
        removeData()
        removeError()
        removeEnd()
      }

      // 3. Actually tell the backend to start
      try {
        const result = await window.electronAPI.chat.stream(text)
        if (result && result.error) {
          cleanup()
          reject(new Error(result.error))
        }
      } catch (e) {
        cleanup()
        reject(e)
      }
    })
  }

  let healthCheckInterval: ReturnType<typeof setInterval> | null = null

  onMounted(async () => {
    await refreshSystemHealth()
    if (!isModelLoaded.value) {
      await initialize(99, false)
    }
    healthCheckInterval = setInterval(() => {
      refreshSystemHealth().catch(console.error)
    }, 30000)
  })

  onUnmounted(() => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
    }
  })

  return {
    // State
    isModelLoaded,
    acceleration,
    gpuLayers,
    isLoading,
    error,
    metrics,
    chatReady,
    agentReady,

    // Computed
    accelerationEmoji,
    statusColor,
    systemStatus,
    isSystemReady,
    formattedMetrics,

    // Methods
    refreshSystemHealth,
    loadModel,
    unloadModel,
    initialize,
    fetchMetrics,
    runAgent,
    predictDirect,
    sendChatMessage,
    streamChatMessage,
  }
}

// Also export a simplified version for basic usage
export function useSimpleAI() {
  const ai = useAI()

  return {
    isReady: ai.isSystemReady,
    status: ai.systemStatus,
    sendMessage: ai.sendChatMessage,
    runTask: ai.runAgent,
    error: ai.error,
  }
}
