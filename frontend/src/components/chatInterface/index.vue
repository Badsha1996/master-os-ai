<script setup lang="ts">
import { ref } from 'vue'

type Mode = 'chat' | 'agent'

interface AgentStep {
  thought: string
  action: {
    name: string
    input: string
  }
  observation: string
}

interface ChatMessage {
  human: string
  ai: string
  loading?: boolean
  steps?: AgentStep[]
  showSteps?: boolean
}

/* **************************** STATE **************************** */
const mode = ref<Mode>('chat')
const userInput = ref('')
const chatMessagesList = ref<ChatMessage[]>([{ human: '', ai: 'Hey! How can I help you today?' }])

/* **************************** HANDLER/ UTILITY FUNCTIONS **************************** */
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

  const index = chatMessagesList.value.indexOf(message)

  try {
    if (mode.value === 'chat') {
      const res = await window.electronAPI.invoke('ai:request', {
        endpoint: '/api/chat/text-to-text',
        method: 'POST',
        body: { text },
      })

      chatMessagesList.value[index] = {
        ...message,
        ai: res.response,
        loading: false,
      }
    } else {
      const res = await window.electronAPI.invoke('ai:request', {
        endpoint: '/api/agent/run',
        method: 'POST',
        body: { task: text },
      })

      let finalAnswer = res.result || ''

      if (!finalAnswer && res.steps?.length) {
        const finishStep = res.steps.find(
          (step: { action: { name: string } }) =>
            step.action.name === 'finish' || step.action.name === 'final_answer',
        )
        if (finishStep && finishStep.observation) {
          finalAnswer = finishStep.observation
        } else {
          const lastStep = res.steps[res.steps.length - 1]
          if (lastStep && lastStep.observation && lastStep.action.name !== 'finish') {
            finalAnswer = lastStep.observation
          }
        }
      }

      chatMessagesList.value[index] = {
        ...message,
        ai: finalAnswer || 'No answer provided.',
        steps: res.steps || [],
        loading: false,
      }
    }
  } catch (err) {
    console.error('Error:', err)
    chatMessagesList.value[index] = {
      ...message,
      ai: 'Something went wrong. Please try again.',
      loading: false,
    }
  }
}

const focusInput = (): void => {
  const input = document.querySelector('input[type="text"]') as HTMLInputElement
  input?.focus()
}
</script>

<template>
  <div class="flex flex-col h-screen bg-linear-to-br from-gray-50 to-gray-100 font-sans">
    <!-- MODE TOGGLE -->
    <div class="flex gap-2 p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div class="flex-1">
        <h1 class="text-lg font-bold text-gray-800">MOS-AI</h1>
      </div>
      <div class="flex gap-2">
        <button
          @click="mode = 'chat'"
          :class="[
            mode === 'chat'
              ? 'bg-linear-to-r from-blue-500 to-blue-600 text-white shadow-md'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
            'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2',
          ]"
        >
          <svg v-if="mode === 'chat'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          Chat Mode
        </button>
        <button
          @click="mode = 'agent'"
          :class="[
            mode === 'agent'
              ? 'bg-linear-to-r from-purple-500 to-purple-600 text-white shadow-md'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
            'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2',
          ]"
        >
          <svg v-if="mode === 'agent'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          Agent Mode
        </button>
      </div>
    </div>

    <!-- CHAT AREA -->
    <main class="flex-1 overflow-y-auto p-4 md:p-6">
      <div class="max-w-3xl mx-auto space-y-6">
        <div v-for="(msg, index) in chatMessagesList" :key="index" class="group">
          <div v-if="msg.human" class="flex justify-end mb-2">
            <div class="max-w-2xl">
              <div
                class="bg-linear-to-r from-blue-500 to-blue-600 text-white p-4 rounded-2xl rounded-tr-none shadow-lg"
              >
                <p class="text-sm leading-relaxed">{{ msg.human }}</p>
              </div>
            </div>
          </div>

          <div v-if="msg.human || !msg.human" class="flex gap-4">
            <!-- AI Avatar -->
            <div v-if="msg.human" class="flex-shrink-0">
              <div
                class="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center"
              >
                <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            </div>

            <!-- Message Content -->
            <div v-if="msg.human" class="flex-1 max-w-2xl">
              <div
                class="bg-white border border-gray-200 rounded-2xl rounded-tl-none shadow-sm p-4"
              >
                <!-- Loading State -->
                <div v-if="msg.loading" class="space-y-3">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style="animation-delay: 0ms"
                    ></div>
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
                </div>

                <!-- AI Response -->
                <div v-else>
                  <p class="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {{ msg.ai }}
                  </p>

                  <!-- AGENT STEPS -->
                  <div v-if="msg.steps?.length" class="mt-4 pt-4 border-t border-gray-100">
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Reasoning Steps
                      </h4>
                      <button
                        @click="msg.showSteps = !msg.showSteps"
                        class="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            v-if="!msg.showSteps"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 9l-7 7-7-7"
                          />
                          <path
                            v-else
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                        {{ msg.showSteps ? 'Hide' : 'Show' }}
                      </button>
                    </div>

                    <div v-if="msg.showSteps" class="space-y-2">
                      <div
                        v-for="(step, i) in msg.steps"
                        :key="i"
                        class="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg p-3"
                      >
                        <div class="flex items-start gap-3">
                          <div
                            class="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold"
                          >
                            {{ i + 1 }}
                          </div>
                          <div class="flex-1 space-y-1.5">
                            <div>
                              <span class="text-xs font-semibold text-gray-500">Thought</span>
                              <p class="text-xs text-gray-700 mt-0.5">{{ step.thought }}</p>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                              <div>
                                <span class="text-xs font-semibold text-gray-500">Action</span>
                                <p class="text-xs text-gray-700 mt-0.5 font-mono">
                                  {{ step.action.name }}({{ step.action.input }})
                                </p>
                              </div>
                              <div>
                                <span class="text-xs font-semibold text-gray-500">Observation</span>
                                <p class="text-xs text-gray-700 mt-0.5">{{ step.observation }}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
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
            :disabled="chatMessagesList.some((m) => m.loading)"
            @keyup.enter="handleInput"
            @keyup="focusInput"
            placeholder="Type your message..."
            type="text"
            class="w-full px-6 py-4 pr-16 bg-white border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          />
          <button
            @click="handleInput"
            :disabled="!userInput.trim() || chatMessagesList.some((m) => m.loading)"
            class="absolute right-3 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <div class="flex items-center justify-between mt-3 px-1">
          <div class="text-xs text-gray-500">
            <span
              :class="[
                mode === 'chat' ? 'text-blue-600' : 'text-purple-600',
                'px-2 py-1 rounded-full bg-opacity-20',
                mode === 'chat' ? 'bg-blue-100' : 'bg-purple-100',
              ]"
            >
              {{ mode === 'chat' ? 'Simple Chat Mode' : 'Advanced Agent Mode' }}
            </span>
          </div>
          <div class="text-xs text-gray-400">Press Enter to send</div>
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
