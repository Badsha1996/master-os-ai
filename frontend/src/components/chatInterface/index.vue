<script setup lang="ts">
import { ref } from 'vue'

interface chatMessageType {
  human: string
  ai: string
  loading?: boolean
}

// API Related Types
interface aiResponseType {
  response: string
}

const aiOutput: string = 'Hey! How can i Help you today'
const userInput = ref<string>('')
const chatMessagesList = ref<chatMessageType[]>([{ human: userInput.value, ai: aiOutput }])

// ************************************ HANDLERS / UTILITY FUNCTIONS ************************************
const handleInput = async (): Promise<void> => {
  const aiResponse: aiResponseType = await window.electronAPI.invoke('ai:request', {
    endpoint: '/api/llm/text-to-text',
    method: 'POST',
    body: { text: userInput.value },
  })

  const chatMessage: chatMessageType = {
    human: userInput.value,
    ai: aiResponse.response,
    loading: true,
  }

  chatMessagesList.value.push(chatMessage)
  userInput.value = ''

  setTimeout(() => {
    const index = chatMessagesList.value.indexOf(chatMessage)

    chatMessagesList.value[index] = {
      ...chatMessage,
      loading: false,
    }
  }, 0)
}
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-100">
    <main class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-for="(chatMessage, index) in chatMessagesList" :key="index">
        <div class="flex items-end justify-end" v-if="chatMessage.human != ''">
          <div class="bg-blue-600 text-white p-3 rounded-lg rounded-br-none shadow-sm max-w-xs">
            <p class="text-sm">{{ chatMessage.human }}</p>
          </div>
        </div>
        <div class="flex items-end">
          <div class="bg-white text-gray-800 p-3 rounded-lg rounded-bl-none shadow-sm max-w-xs">
            <p class="text-sm" v-if="chatMessage.loading">thinking...</p>
            <p class="text-sm" v-else>{{ chatMessage.ai }}</p>
          </div>
        </div>
      </div>
    </main>

    <footer class="bg-white p-4">
      <div class="flex items-center space-x-2">
        <input
          type="text"
          v-model="userInput"
          @keyup.enter="handleInput"
          placeholder="Type your message..."
          class="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          @click="handleInput"
          @keyup.enter="handleInput"
          class="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"
            />
          </svg>
        </button>
      </div>
    </footer>
  </div>
</template>
