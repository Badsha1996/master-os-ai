<script setup lang="ts">
import { useAI } from '@/composables/useAI'
import Sidebar from '@/components/sidebar/index.vue'
import type { AgentStep } from '@/types/electron'
import { ref, nextTick } from 'vue'

type Mode = 'chat' | 'agent'

interface ChatMessage {
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

// ************************ SERVICES ************************
const ai = useAI()

// ************************ STATES ************************
const mode = ref<Mode>('chat')
const userInput = ref('')
const chatMessagesList = ref<ChatMessage[]>([
  {
    human: '',
    ai: 'Hey! How can I help you today?',
  },
])
const showSettings = ref(false)
const showMetrics = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const sidebarOpen = ref(true)
const sidebarTab = ref<'chat' | 'files' | 'metrics'>('chat')

// ************************ HELPERS ************************
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// ************************ FILE WATCHING HANDLERS ************************
const handleWatchFolder = async () => {
  try {
    await ai.openFolderDialog()
  } catch (err: any) {
    console.error('Failed to watch folder:', err)
    alert('Failed to watch folder: ' + err.message)
  }
}

const handleStopWatcher = async (watcherId: string) => {
  try {
    await ai.stopWatchingFolder(watcherId)
  } catch (err: any) {
    console.error('Failed to stop watcher:', err)
  }
}

const handleViewEvents = async (watcherId: string) => {
  try {
    const events = await ai.getFileEvents(watcherId)
    console.log('Events:', events)
    alert(`Found ${events.length} events. Check console for details.`)
  } catch (err: any) {
    console.error('Failed to get events:', err)
  }
}

// ************************ CHAT HANDLERS ************************
const handleInput = async (): Promise<void> => {
  const text = userInput.value.trim()
  if (!text) return

  const message: ChatMessage = {
    human: text,
    ai: '',
    loading: true,
    showSteps: false,
    currentThinking: '',
  }

  chatMessagesList.value.push(message)
  userInput.value = ''
  scrollToBottom()

  const messageIndex = chatMessagesList.value.length - 1

  try {
    if (mode.value === 'chat') {
      await ai.streamChatMessage(text, (chunk) => {
        if (chatMessagesList.value[messageIndex]) {
          chatMessagesList.value[messageIndex].ai += chunk
          chatMessagesList.value[messageIndex].loading = false
        }
        scrollToBottom()
      })
    } else {
      const updateThinking = (thinking: string) => {
        if (chatMessagesList.value[messageIndex]) {
          chatMessagesList.value[messageIndex].currentThinking = thinking
        }
        scrollToBottom()
      }

      try {
        updateThinking('Analyzing your request...')
        const res = await ai.runAgent(text)

        let finalAnswer = res.result || ''

        if (!finalAnswer && res.steps?.length) {
          const finishStep = res.steps.find(
            (step) => step.action.name === 'finish' || step.action.name === 'final_answer',
          )

          if (finishStep) {
            finalAnswer = finishStep.action.input || finishStep.observation || finishStep.thought
          } else {
            const lastStep = res.steps[res.steps.length - 1]
            finalAnswer = lastStep?.observation || 'Agent completed but provided no answer.'
          }
        }

        if (!finalAnswer || finalAnswer.trim() === '') {
          finalAnswer =
            "I processed your request but couldn't generate a proper response. Please try rephrasing."
        }

        if (chatMessagesList.value[messageIndex]) {
          chatMessagesList.value[messageIndex] = {
            ...message,
            ai: finalAnswer,
            steps: res.steps || [],
            loading: false,
            currentThinking: '',
          }
        }
      } catch (err: any) {
        throw err
      }
    }
  } catch (err: any) {
    console.error('Error:', err)
    if (chatMessagesList.value[messageIndex]) {
      chatMessagesList.value[messageIndex] = {
        ...message,
        ai: err.message || 'Something went wrong. Please try again.',
        loading: false,
        currentThinking: '',
      }
    }
  }

  scrollToBottom()
}

const handleLoadModel = async (layers: number) => {
  try {
    await ai.loadModel(layers)
    alert(`Model loaded with ${ai.acceleration.value} acceleration!`)
  } catch (err) {
    alert('Failed to load model: ' + ai.error.value)
  }
}

const handleUnloadModel = async () => {
  try {
    await ai.unloadModel()
    alert('Model unloaded successfully!')
  } catch (err) {
    alert('Failed to unload model: ' + ai.error.value)
  }
}

const handleTestDirect = async () => {
  try {
    const result = await ai.predictDirect('What is 2+2?', 100, 0.1)
    alert(`Result: ${result.text}\nAcceleration: ${result.acceleration}`)
  } catch (err) {
    alert('Test failed: ' + ai.error.value)
  }
}

const handleFetchMetrics = async () => {
  try {
    await ai.fetchMetrics()
    showMetrics.value = true
  } catch (err) {
    alert('Failed to fetch metrics: ' + ai.error.value)
  }
}

const handleCancelChat = async () => {
  try {
    await ai.cancelChat()
    alert('Chat operations cancelled!')
  } catch (err) {
    alert('Failed to cancel: ' + ai.error.value)
  }
}
</script>

<template>
  <div class="flex h-screen bg-slate-950 text-white overflow-hidden">
    <!-- Sidebar Component -->
    <Sidebar
      v-model="sidebarOpen"
      :active-tab="sidebarTab"
      :watched-folders="ai.watchedFolders.value"
      @tab-change="sidebarTab = $event"
      @watch-folder="handleWatchFolder"
      @stop-watcher="handleStopWatcher"
      @view-events="handleViewEvents"
    />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <header
        class="flex items-center justify-between px-6 py-4 bg-slate-900/50 backdrop-blur-xl border-b border-slate-800"
      >
        <div class="flex items-center gap-4">
          <!-- Sidebar Toggle -->
          <button
            v-if="!sidebarOpen"
            @click="sidebarOpen = true"
            class="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title="Open sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"
            >
              <span class="text-xl">✨</span>
            </div>
            <div>
              <h1
                class="text-xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              >
                MOS-AI
              </h1>
              <div class="flex items-center gap-2 mt-0.5">
                <div
                  :class="[
                    'w-1.5 h-1.5 rounded-full animate-pulse',
                    ai.statusColor.value === 'green'
                      ? 'bg-green-400'
                      : ai.statusColor.value === 'yellow'
                        ? 'bg-yellow-400'
                        : 'bg-red-400',
                  ]"
                />
                <span class="text-xs text-slate-400">{{ ai.systemStatus.value }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex gap-2 bg-slate-800/30 p-1 rounded-lg">
            <button
              @click="mode = 'chat'"
              :class="[
                'flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all',
                mode === 'chat'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white',
              ]"
            >
              💬 Chat
            </button>
            <button
              @click="mode = 'agent'"
              :class="[
                'flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all',
                mode === 'agent'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                  : 'text-slate-400 hover:text-white',
              ]"
            >
              🤖 Agent
            </button>
          </div>

          <button
            @click="showSettings = !showSettings"
            class="p-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all"
          >
            ⚙️
          </button>
        </div>
      </header>

      <!-- Settings Panel -->
      <transition name="slide-down">
        <div
          v-if="showSettings"
          class="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 p-6"
        >
          <div class="max-w-4xl mx-auto space-y-4">
            <h3 class="font-semibold text-lg flex items-center gap-2">⚙️ System Controls</h3>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                @click="handleLoadModel(99)"
                :disabled="ai.isLoading.value"
                class="flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg transition-all disabled:opacity-50"
              >
                🚀 Load GPU
              </button>
              <button
                @click="handleLoadModel(0)"
                :disabled="ai.isLoading.value"
                class="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-lg transition-all disabled:opacity-50"
              >
                🐢 Load CPU
              </button>
              <button
                @click="handleUnloadModel"
                :disabled="ai.isLoading.value"
                class="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg transition-all disabled:opacity-50"
              >
                🔴 Unload
              </button>
              <button
                @click="ai.refreshSystemHealth"
                :disabled="ai.isLoading.value"
                class="flex items-center justify-center gap-2 px-4 py-3 bg-slate-600/50 hover:bg-slate-600 border border-slate-500/30 rounded-lg transition-all disabled:opacity-50"
              >
                🔄 Refresh
              </button>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <button
                @click="handleFetchMetrics"
                class="flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 rounded-lg transition-all"
              >
                📊 View Metrics
              </button>
              <button
                @click="handleTestDirect"
                class="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-400 rounded-lg transition-all"
              >
                🧪 Test Direct LLM
              </button>
              <button
                @click="handleCancelChat"
                class="flex items-center justify-center gap-2 px-4 py-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 rounded-lg transition-all"
              >
                🛑 Cancel Chat
              </button>
            </div>

            <div
              v-if="ai.error.value || ai.fileWatchError.value"
              class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
            >
              ⚠️ {{ ai.error.value || ai.fileWatchError.value }}
            </div>
          </div>
        </div>
      </transition>

      <!-- Chat Area -->
      <main
        ref="messagesContainer"
        class="flex-1 overflow-y-auto px-6 py-8 bg-linear-to-br from-slate-950 via-slate-900 to-slate-950"
      >
        <div class="max-w-4xl mx-auto space-y-6">
          <div v-for="(msg, index) in chatMessagesList" :key="index" class="space-y-3">
            <!-- User Message -->
            <div v-if="msg.human" class="flex justify-end">
              <div
                class="max-w-2xl bg-linear-to-r from-blue-500 to-blue-600 px-5 py-3 rounded-2xl rounded-tr-sm shadow-lg"
              >
                <p class="text-sm leading-relaxed">{{ msg.human }}</p>
              </div>
            </div>

            <!-- AI Response -->
            <div v-if="msg.human || !msg.human" class="flex gap-4">
              <div v-if="msg.human" class="shrink-0">
                <div
                  class="w-10 h-10 bg-linear-to-br from-slate-700 to-slate-600 rounded-xl flex items-center justify-center shadow-lg"
                >
                  <span class="text-lg">{{ ai.accelerationEmoji.value }}</span>
                </div>
              </div>

              <div
                v-if="msg.human"
                class="flex-1 max-w-2xl bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl rounded-tl-sm shadow-lg px-5 py-4"
              >
                <!-- Loading / Thinking State -->
                <div v-if="msg.loading" class="space-y-3">
                  <div class="flex items-center gap-2">
                    <div class="flex gap-1">
                      <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                      <div
                        class="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style="animation-delay: 150ms"
                      />
                      <div
                        class="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style="animation-delay: 300ms"
                      />
                    </div>
                    <span class="text-sm text-slate-400 ml-2">
                      {{ mode === 'agent' ? 'Agent Thinking...' : 'Thinking...' }}
                    </span>
                  </div>

                  <div
                    v-if="msg.currentThinking && mode === 'agent'"
                    class="mt-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"
                  >
                    <div class="flex items-start gap-2">
                      <span class="text-purple-400 text-xs mt-0.5">🧠</span>
                      <p class="text-xs text-purple-300 italic">{{ msg.currentThinking }}</p>
                    </div>
                  </div>
                </div>

                <!-- Response Content -->
                <div v-else>
                  <p class="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {{ msg.ai }}
                  </p>

                  <!-- Metrics -->
                  <div
                    v-if="msg.tokensGenerated || msg.timeMs"
                    class="mt-3 pt-3 border-t border-slate-700/50"
                  >
                    <div class="flex items-center gap-4 text-xs text-slate-400">
                      <span v-if="msg.tokensGenerated">🔢 {{ msg.tokensGenerated }} tokens</span>
                      <span v-if="msg.timeMs">⏱️ {{ msg.timeMs }}ms</span>
                      <span v-if="msg.acceleration">
                        {{ msg.acceleration === 'GPU' ? '🚀' : '🐢' }} {{ msg.acceleration }}
                      </span>
                    </div>
                  </div>

                  <!-- Agent Steps -->
                  <div v-if="msg.steps?.length" class="mt-4 pt-4 border-t border-slate-700/50">
                    <button
                      @click="msg.showSteps = !msg.showSteps"
                      class="flex items-center gap-2 text-xs px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg transition-all"
                    >
                      {{ msg.showSteps ? '▲' : '▼' }}
                      {{ msg.showSteps ? 'Hide' : 'Show' }} Reasoning Steps ({{
                        msg.steps.length
                      }})
                    </button>

                    <transition name="expand">
                      <div v-if="msg.showSteps" class="space-y-2 mt-3">
                        <div
                          v-for="(step, i) in msg.steps"
                          :key="i"
                          class="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4"
                        >
                          <div class="flex items-center gap-2 mb-2">
                            <span class="font-semibold text-purple-400">Step {{ i + 1 }}</span>
                            <span
                              class="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded"
                            >
                              {{ step.action.name }}
                            </span>
                          </div>
                          <div class="space-y-2 text-xs">
                            <div class="flex gap-2">
                              <span class="text-slate-500 font-medium min-w-20"
                                >💭 Thought:</span
                              >
                              <span class="text-slate-300">{{ step.thought }}</span>
                            </div>
                            <div class="flex gap-2">
                              <span class="text-slate-500 font-medium min-w-20"
                                >⚡ Input:</span
                              >
                              <span class="text-blue-300 font-mono">{{ step.action.input }}</span>
                            </div>
                            <div class="flex gap-2">
                              <span class="text-slate-500 font-medium min-w-20"
                                >👁️ Result:</span
                              >
                              <span class="text-green-300">{{ step.observation }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </transition>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Input Area -->
      <footer class="px-6 py-4 bg-slate-900/50 backdrop-blur-xl border-t border-slate-800">
        <div class="max-w-4xl mx-auto">
          <div class="relative">
            <input
              v-model="userInput"
              @keyup.enter="handleInput"
              :placeholder="
                ai.isSystemReady.value ? 'Type your message...' : 'Initializing AI Engine...'
              "
              :disabled="!ai.isSystemReady.value || chatMessagesList.some((m) => m.loading)"
              type="text"
              class="w-full px-6 py-4 pr-14 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white"
            />

            <button
              @click="handleInput"
              :disabled="
                !userInput.trim() ||
                chatMessagesList.some((m) => m.loading) ||
                !ai.isSystemReady.value
              "
              class="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
            >
              <span v-if="ai.isSystemReady.value && !chatMessagesList.some((m) => m.loading)"
                >➤</span
              >
              <span v-else class="animate-spin text-xs">⏳</span>
            </button>
          </div>
          <div class="flex justify-between mt-3 px-1 text-xs">
            <span
              :class="
                mode === 'chat' ? 'text-blue-400 font-medium' : 'text-purple-400 font-medium'
              "
            >
              {{ mode === 'chat' ? '💬 Chat Mode (SSE Streaming)' : '🤖 Agent Mode (ReAct)' }}
            </span>
            <span class="text-slate-500">
              {{ ai.isSystemReady.value ? 'Press Enter ⏎' : '⚠️ Not Ready' }}
            </span>
          </div>
        </div>
      </footer>

      <!-- Metrics Modal -->
      <teleport to="body">
        <transition name="fade">
          <div
            v-if="showMetrics && ai.formattedMetrics.value"
            class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            @click="showMetrics = false"
          >
            <div
              class="bg-slate-800 border border-slate-700/50 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              @click.stop
            >
              <h3 class="text-xl font-bold mb-4 flex items-center gap-2">📊 LLM Metrics</h3>
              <div class="space-y-3">
                <div
                  v-for="(value, key) in ai.formattedMetrics.value"
                  :key="key"
                  class="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0"
                >
                  <span class="text-slate-400 text-sm">{{ key }}</span>
                  <span class="font-semibold text-blue-400">{{ value }}</span>
                </div>
              </div>
              <button
                @click="showMetrics = false"
                class="mt-6 w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </transition>
      </teleport>
    </div>
  </div>
</template>

<style scoped>
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #1e293b;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}
</style>