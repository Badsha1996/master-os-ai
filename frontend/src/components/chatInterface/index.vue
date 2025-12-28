<script setup lang="ts">
import { useAI } from '@/composables/useAI'
import type { AgentStep } from '@/types/electron'
import { ref } from 'vue'

type Mode = 'chat' | 'agent'

interface ChatMessage {
  human: string
  ai: string
  loading?: boolean
  steps?: AgentStep[]
  showSteps?: boolean
  acceleration?: string
  tokensGenerated?: number
  timeMs?: number
}

// ***************************** Services and additonal calls **********************
const ai = useAI()

// ************************ STATES ************************
const mode = ref<Mode>('chat')
const userInput = ref('')
const chatMessagesList = ref<ChatMessage[]>([{ human: '', ai: 'Hey! How can I help you today?' }])
const showSettings = ref(false)
const showMetrics = ref(false)
const useStreaming = ref(false)

// ************************ HANDLERS ************************
const handleInput = async (): Promise<void> => {
  const text = userInput.value.trim()
  if (!text) return

  const message: ChatMessage = {
    human: text,
    ai: '',
    loading: true,
    showSteps: false,
  }

  chatMessagesList.value.push(message)
  userInput.value = ''

  const index = chatMessagesList.value.length - 1

  try {
    if (mode.value === 'chat') {
      if (useStreaming.value) {
        const messageIndex = chatMessagesList.value.length - 1

        try {
          await ai.streamChatMessage(text, (chunk) => {
            // 2. Append directly to the object inside the array
            // This ensures Vue's deep reactivity picks it up immediately
            if (chatMessagesList.value[messageIndex]) {
              chatMessagesList.value[messageIndex].ai += chunk
              chatMessagesList.value[messageIndex].loading = false // Turn off loading on first chunk
            }
          })
        } catch (error) {
          console.error('Streaming failed:', error)
          if (chatMessagesList.value[index]) {
            chatMessagesList.value[index].ai = 'Error during streaming'
            chatMessagesList.value[index].loading = false
          }
        }
      } else {
        const res = await ai.sendChatMessage(text)
        if (chatMessagesList.value[index]) {
          chatMessagesList.value[index] = {
            ...message,
            ai: res.response,
            loading: false,
            acceleration: res.acceleration,
            tokensGenerated: res.tokens_generated,
            timeMs: res.time_ms,
          }
        }
      }
    } else {
      const res = await ai.runAgent(text)

      let finalAnswer = res.result || ''

      if (!finalAnswer && res.steps?.length) {
        const finishStep = res.steps.find(
          (step) => step.action.name === 'finish' || step.action.name === 'final_answer',
        )
        if (finishStep?.observation) {
          finalAnswer = finishStep.observation
        } else {
          const lastStep = res.steps[res.steps.length - 1]
          if (lastStep?.observation && lastStep.action.name !== 'finish') {
            finalAnswer = lastStep.observation
          }
        }
      }

      if (chatMessagesList.value[index]) {
        chatMessagesList.value[index] = {
          ...message,
          ai: finalAnswer || 'No answer provided.',
          steps: res.steps || [],
          loading: false,
        }
      }
    }
  } catch (err) {
    console.error('Error:', err)
    if (chatMessagesList.value[index]) {
      chatMessagesList.value[index] = {
        ...message,
        ai: ai.error.value || 'Something went wrong. Please try again.',
        loading: false,
      }
    }
  }
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

const focusInput = (): void => {
  const input = document.querySelector('input[type="text"]') as HTMLInputElement
  input?.focus()
}
</script>

<template>
  <div class="flex flex-col h-screen bg-linear-to-br from-gray-50 to-gray-100 font-sans">
    <!-- HEADER -->
    <div class="flex gap-2 p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div class="flex-1 flex items-center gap-3">
        <h1 class="text-lg font-bold text-gray-800">MOS-AI</h1>

        <div class="flex items-center gap-2">
          <div :class="['w-2 h-2 rounded-full', `bg-${ai.statusColor.value}-500`]"></div>
          <span class="text-xs text-gray-600">{{ ai.systemStatus.value }}</span>
        </div>
      </div>

      <div class="flex gap-2">
        <button
          @click="mode = 'chat'"
          :class="[
            mode === 'chat'
              ? 'bg-linear-to-r from-blue-500 to-blue-600 text-white shadow-md'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
            'px-4 py-2 rounded-lg font-medium transition-all',
          ]"
        >
          Chat
        </button>
        <button
          @click="mode = 'agent'"
          :class="[
            mode === 'agent'
              ? 'bg-linear-to-r from-purple-500 to-purple-600 text-white shadow-md'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
            'px-4 py-2 rounded-lg font-medium transition-all',
          ]"
        >
          Agent
        </button>

        <button
          @click="showSettings = !showSettings"
          class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ⚙️
        </button>
      </div>
    </div>

    <!-- SETTINGS -->
    <div v-if="showSettings" class="bg-white border-b border-gray-200 p-4">
      <div class="max-w-3xl mx-auto space-y-4">
        <h3 class="font-semibold text-gray-800">System Controls</h3>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            @click="handleLoadModel(99)"
            :disabled="ai.isLoading.value"
            class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
          >
            🚀 Load GPU
          </button>
          <button
            @click="handleLoadModel(0)"
            :disabled="ai.isLoading.value"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            🐢 Load CPU
          </button>
          <button
            @click="handleUnloadModel"
            :disabled="ai.isLoading.value"
            class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm"
          >
            🔴 Unload
          </button>
          <button
            @click="ai.refreshSystemHealth"
            :disabled="ai.isLoading.value"
            class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 text-sm"
          >
            🔄 Refresh
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            @click="handleFetchMetrics"
            class="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm"
          >
            📊 View Metrics
          </button>
          <button
            @click="handleTestDirect"
            class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
          >
            🧪 Test Direct LLM
          </button>
        </div>

        <div class="flex items-center gap-2">
          <input type="checkbox" v-model="useStreaming" id="streaming" class="rounded" />
          <label for="streaming" class="text-sm text-gray-700">
            Enable Streaming (Chat Mode Only)
          </label>
        </div>

        <div
          v-if="ai.error.value"
          class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
        >
          ⚠️ {{ ai.error.value }}
        </div>
      </div>
    </div>

    <!-- METRICS MODAL -->
    <div
      v-if="showMetrics && ai.formattedMetrics.value"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="showMetrics = false"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4" @click.stop>
        <h3 class="text-lg font-bold mb-4">📊 LLM Metrics</h3>
        <div class="space-y-2 text-sm">
          <div
            v-for="(value, key) in ai.formattedMetrics.value"
            :key="key"
            class="flex justify-between"
          >
            <span class="text-gray-600">{{ key }}:</span>
            <span class="font-semibold">{{ value }}</span>
          </div>
        </div>
        <button
          @click="showMetrics = false"
          class="mt-4 w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>

    <!-- CHAT AREA -->
    <main class="flex-1 overflow-y-auto p-4 md:p-6">
      <div class="max-w-3xl mx-auto space-y-6">
        <div v-for="(msg, index) in chatMessagesList" :key="index">
          <div v-if="msg.human" class="flex justify-end mb-2">
            <div
              class="max-w-2xl bg-linear-to-r from-blue-500 to-blue-600 text-white p-4 rounded-2xl rounded-tr-none shadow-lg"
            >
              <p class="text-sm leading-relaxed">{{ msg.human }}</p>
            </div>
          </div>

          <div v-if="msg.human || !msg.human" class="flex gap-4">
            <div v-if="msg.human" class="flex-shrink-0">
              <div
                class="w-10 h-10 bg-linear-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center"
              >
                {{ ai.accelerationEmoji.value }}
              </div>
            </div>

            <div
              v-if="msg.human"
              class="flex-1 max-w-2xl bg-white border border-gray-200 rounded-2xl rounded-tl-none shadow-sm p-4"
            >
              <div v-if="msg.loading" class="flex items-center gap-2">
                <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div
                  class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style="animation-delay: 150ms"
                ></div>
                <div
                  class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style="animation-delay: 300ms"
                ></div>
                <span class="text-sm text-gray-600 ml-2">Thinking...</span>
              </div>

              <div v-else>
                <p class="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {{ msg.ai }}
                </p>

                <div
                  v-if="msg.tokensGenerated || msg.timeMs"
                  class="mt-3 pt-3 border-t border-gray-100"
                >
                  <div class="flex items-center gap-4 text-xs text-gray-500">
                    <span v-if="msg.tokensGenerated">🔢 {{ msg.tokensGenerated }} tokens</span>
                    <span v-if="msg.timeMs">⏱️ {{ msg.timeMs }}ms</span>
                    <span v-if="msg.acceleration">
                      {{ msg.acceleration === 'GPU' ? '🚀' : '🐢' }} {{ msg.acceleration }}
                    </span>
                  </div>
                </div>

                <div v-if="msg.steps?.length" class="mt-4 pt-4 border-t border-gray-100">
                  <button
                    @click="msg.showSteps = !msg.showSteps"
                    class="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    {{ msg.showSteps ? '▲ Hide' : '▼ Show' }} Reasoning Steps
                  </button>

                  <div v-if="msg.showSteps" class="space-y-2 mt-3">
                    <div
                      v-for="(step, i) in msg.steps"
                      :key="i"
                      class="bg-gray-50 border rounded-lg p-3 text-xs"
                    >
                      <div class="font-semibold text-gray-700">Step {{ i + 1 }}</div>
                      <div class="mt-1"><strong>Thought:</strong> {{ step.thought }}</div>
                      <div>
                        <strong>Action:</strong> {{ step.action.name }}({{ step.action.input }})
                      </div>
                      <div><strong>Result:</strong> {{ step.observation }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- INPUT -->
    <footer class="bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4">
      <div class="max-w-3xl mx-auto">
        <div class="relative">
          <input
            v-model="userInput"
            @keyup.enter="handleInput"
            @keyup="focusInput"
            :placeholder="
              ai.isSystemReady.value ? 'Type your message...' : 'Initializing AI Engine...'
            "
            type="text"
            class="w-full px-6 py-4 pr-16 bg-white border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 shadow-sm"
          />

          <button
            @click="handleInput"
            :disabled="
              !userInput.trim() ||
              chatMessagesList.some((m) => m.loading) ||
              !ai.isSystemReady.value
            "
            class="absolute right-3 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="ai.isSystemReady.value">➤</span>
            <span v-else class="animate-spin text-xs">⏳</span>
          </button>
        </div>
        <div class="flex justify-between mt-3 px-1 text-xs text-gray-500">
          <span :class="mode === 'chat' ? 'text-blue-600' : 'text-purple-600'">
            {{ mode === 'chat' ? '💬 Chat Mode' : '🤖 Agent Mode' }}
          </span>
          <span>{{ ai.isSystemReady.value ? 'Press Enter ⏎' : '⚠️ Not Ready' }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style>
