import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiService } from '../services/api'
import type { MetricsResponse, FileEvent } from '../types/electron'

interface WatchedFolder {
  id: string
  path: string
  status: 'active' | 'stopped'
  events: FileEvent[]
}

export function useAI() {
  const isModelLoaded = ref(false)
  const acceleration = ref<'GPU' | 'CPU' | 'None'>('None')
  const gpuLayers = ref(99)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const metrics = ref<MetricsResponse | null>(null)
  const chatReady = ref(false)
  const agentReady = ref(false)

  // File watching state
  const watchedFolders = ref<WatchedFolder[]>([])
  const fileWatchError = ref<string | null>(null)

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

  const isSystemReady = computed(() => {
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
      error.value = null

      const health = await apiService.checkSystemHealth()

      console.log('📡 Health Response:', JSON.stringify(health, null, 2))

      isModelLoaded.value = health.chat.model_loaded || health.agent.is_loaded
      
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

  async function cancelChat() {
    try {
      error.value = null
      return await apiService.cancelChat()
    } catch (err) {
      error.value = String(err)
      console.error('Failed to cancel chat:', err)
      throw err
    }
  }

  const streamChatMessage = async (text: string, onChunk: (chunk: string) => void) => {
    try {
      return await apiService.streamChatMessage(text, onChunk)
    } catch (err) {
      error.value = String(err)
      console.error('Failed to  response:', err)
      throw err
    }
  }

  // **************************** FILE WATCHING FUNCTIONS ****************************

  async function startWatchingFolder(folderPath: string) {
    try {
      fileWatchError.value = null
      
      const result = await apiService.startWatchingFolder(folderPath)
      
      const newFolder: WatchedFolder = {
        id: result.watcher_id,
        path: folderPath,
        status: 'active',
        events: [],
      }
      
      watchedFolders.value.push(newFolder)
      
      // Start polling for events
      startPollingEvents(result.watcher_id)
      
      return result
    } catch (err) {
      fileWatchError.value = String(err)
      console.error('Failed to start watching folder:', err)
      throw err
    }
  }

  async function stopWatchingFolder(watcherId: string) {
    try {
      fileWatchError.value = null
      
      await apiService.stopWatchingFolder(watcherId)
      
      // Remove from watched folders
      watchedFolders.value = watchedFolders.value.filter(f => f.id !== watcherId)
      
      // Stop polling for this watcher
      if (eventPollers[watcherId]) {
        clearInterval(eventPollers[watcherId])
        delete eventPollers[watcherId]
      }
    } catch (err) {
      fileWatchError.value = String(err)
      console.error('Failed to stop watching folder:', err)
      throw err
    }
  }

  async function getFileEvents(watcherId: string) {
    try {
      fileWatchError.value = null
      
      const result = await apiService.getFileEvents(watcherId)
      
      // Update events in watched folder
      const folder = watchedFolders.value.find(f => f.id === watcherId)
      if (folder) {
        folder.events = result.events
      }
      
      return result.events
    } catch (err) {
      fileWatchError.value = String(err)
      console.error('Failed to get file events:', err)
      throw err
    }
  }

  async function openFolderDialog() {
    try {
      fileWatchError.value = null
      const folders = await apiService.openFolderDialog()
      
      // Start watching all selected folders
      for (const folderPath of folders) {
        await startWatchingFolder(folderPath)
      }
      
      return folders
    } catch (err) {
      fileWatchError.value = String(err)
      console.error('Failed to open folder dialog:', err)
      throw err
    }
  }

  // Event polling management
  const eventPollers: Record<string, ReturnType<typeof setInterval>> = {}

  function startPollingEvents(watcherId: string) {
    // Poll every 5 seconds
    eventPollers[watcherId] = setInterval(async () => {
      const folder = watchedFolders.value.find(f => f.id === watcherId)
      if (!folder || folder.status !== 'active') {
        clearInterval(eventPollers[watcherId])
        delete eventPollers[watcherId]
        return
      }

      try {
        await getFileEvents(watcherId)
      } catch (err) {
        console.error(`Failed to poll events for ${watcherId}:`, err)
      }
    }, 5000)
  }

  // **************************** LIFECYCLE ****************************

  let healthCheckInterval: ReturnType<typeof setInterval> | null = null
  let readinessPoller: ReturnType<typeof setInterval> | null = null

  onMounted(async () => {
    console.log('🚀 Initializing AI system...')
    
    await refreshSystemHealth()
    
    if (!isModelLoaded.value) {
      console.log('📦 Model not loaded, initializing...')
      await initialize(99, false)
      await new Promise(resolve => setTimeout(resolve, 1000))
      await refreshSystemHealth()
    }

    if (!isSystemReady.value) {
      console.log('⏳ System not ready yet, starting smart polling...')
      
      let pollCount = 0
      const maxQuickPolls = 10
      
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
          console.log('⏱️ Slowing down polling, system taking longer than expected')
          if (readinessPoller) {
            clearInterval(readinessPoller)
            readinessPoller = null
          }
          
          readinessPoller = setInterval(async () => {
            await refreshSystemHealth()
            if (isSystemReady.value && readinessPoller) {
              clearInterval(readinessPoller)
              readinessPoller = null
              console.log('✅ System ready (after extended wait)')
            }
          }, 3000)
        }
      }, 500)

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
    // Stop all event pollers
    Object.values(eventPollers).forEach(interval => clearInterval(interval))
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

    // File watching state
    watchedFolders,
    fileWatchError,

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
    cancelChat,

    // File watching methods
    startWatchingFolder,
    stopWatchingFolder,
    getFileEvents,
    openFolderDialog,
  }
}

// Simplified version for basic usage
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