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

  // FIX: Make system ready if EITHER chat OR agent is ready (not both)
  const isSystemReady = computed(() => {
    // If model is loaded and at least one service is ready
    const ready = isModelLoaded.value && (chatReady.value || agentReady.value)
    console.log('🔍 isSystemReady:', ready, '| chatReady:', chatReady.value, '| agentReady:', agentReady.value, '| isModelLoaded:', isModelLoaded.value)
    return ready
  })

  const formattedMetrics = computed(() => {
    if (!metrics.value) return null
    return apiService.formatMetrics(metrics.value)
  })

  // **************************** HELPERS / UTILITY FUNCTIONS ****************************

  async function refreshSystemHealth() {
    try {
      // Don't set loading during health checks - it causes UI flicker
      error.value = null

      const health = await apiService.checkSystemHealth()

      console.log('📡 Health Response:', JSON.stringify(health, null, 2))

      // Update states based on health check
      isModelLoaded.value = health.chat.model_loaded || health.agent.is_loaded
      
      // Get acceleration from whichever service is loaded
      if (health.chat.acceleration && health.chat.acceleration !== 'None') {
        acceleration.value = health.chat.acceleration as any
      } else if (health.agent.acceleration && health.agent.acceleration !== 'None') {
        acceleration.value = health.agent.acceleration as any
      }
      
      gpuLayers.value = health.agent.gpu_layers
      chatReady.value = health.chat.ready
      agentReady.value = health.agent.is_loaded

      return health
    } catch (err) {
      error.value = String(err)
      console.error('❌ Failed to refresh system health:', err)
      throw err
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

  const streamChatMessage = async (text: string, onChunk: (chunk: string) => void) => {
    // 1. Force cleanup
    window.electronAPI.removeAllStreamListeners()

    return new Promise<void>(async (resolve, reject) => {
      const removeData = window.electronAPI.on('ai:stream-data', (data) => {
        // Handle standardized object from Electron Bridge
        if (data.text) onChunk(data.text)
        if (data.done) {
          cleanup()
          resolve()
        }
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

      try {
        await window.electronAPI.chat.stream(text)
      } catch (e) {
        cleanup()
        reject(e)
      }
    })
  }

  let healthCheckInterval: ReturnType<typeof setInterval> | null = null
  let readinessPoller: ReturnType<typeof setInterval> | null = null

  onMounted(async () => {
    console.log('🚀 Initializing AI system...')
    
    // Initial health check
    await refreshSystemHealth()
    
    // Initialize if model not loaded
    if (!isModelLoaded.value) {
      console.log('📦 Model not loaded, initializing...')
      await initialize(99, false)
      // Wait a bit after init
      await new Promise(resolve => setTimeout(resolve, 1000))
      await refreshSystemHealth()
    }

    // SMARTER POLLING: Start with aggressive, then back off
    if (!isSystemReady.value) {
      console.log('⏳ System not ready yet, starting smart polling...')
      
      let pollCount = 0
      const maxQuickPolls = 10 // Only poll aggressively for 5 seconds
      
      readinessPoller = setInterval(async () => {
        await refreshSystemHealth()
        pollCount++
        
        if (isSystemReady.value) {
          console.log('✅ System is NOW READY!')
          if (readinessPoller) {
            clearInterval(readinessPoller)
            readinessPoller = null
          }
        } else if (pollCount >= maxQuickPolls) {
          // After 5 seconds of aggressive polling, slow down
          console.log('⏱️ Slowing down polling, system taking longer than expected')
          if (readinessPoller) {
            clearInterval(readinessPoller)
            readinessPoller = null
          }
          
          // Switch to slower polling
          readinessPoller = setInterval(async () => {
            await refreshSystemHealth()
            if (isSystemReady.value && readinessPoller) {
              clearInterval(readinessPoller)
              readinessPoller = null
              console.log('✅ System ready (after extended wait)')
            }
          }, 3000) // Every 3 seconds
        }
      }, 500) // Check every 500ms for first 5 seconds

      // Safety timeout after 30 seconds
      setTimeout(() => {
        if (!isSystemReady.value && readinessPoller) {
          console.error('❌ System failed to become ready in 30 seconds')
          clearInterval(readinessPoller)
          readinessPoller = null
          error.value = 'System initialization timeout. Backend may not be responding correctly.'
        }
      }, 30000)
    } else {
      console.log('✅ System already ready!')
    }

    // Start normal periodic health checks (every 30s)
    healthCheckInterval = setInterval(() => {
      refreshSystemHealth().catch(console.error)
    }, 30000)
  })

  onUnmounted(() => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
      healthCheckInterval = null
    }
    if (readinessPoller) {
      clearInterval(readinessPoller)
      readinessPoller = null
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
    streamChatMessage,
  }
}

// Also export a simplified version for basic usage
export function useSimpleAI() {
  const ai = useAI()

  return {
    isReady: ai.isSystemReady,
    status: ai.systemStatus,
    sendMessage: ai.streamChatMessage,
    runTask: ai.runAgent,
    error: ai.error,
  }
}