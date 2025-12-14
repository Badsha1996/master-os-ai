<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const files = ref<string[]>([])
const watcherId = ref<string | null>(null)

let poller: number | null = null

async function handleStartWathingFilesSystem() {
  const folders: string[] = await window.electronAPI.invoke('dialog:openFolder')
  if (!folders?.length) return

  const response = await window.electronAPI.invoke('ai:request', {
    endpoint: '/api/file/observe/start',
    method: 'POST',
    body: { path: folders[0] },
  })

  
  const data = await response
  watcherId.value = data.watcher_id

  startPolling()
}

async function handleFetchEventsFileSystem() {
  if (!watcherId.value) return

  const response = await window.electronAPI.invoke('ai:request', {
    endpoint: `/api/file/observe/${watcherId.value}/events`,
    method: 'GET',
  })

  const data = await response
  files.value = data.events.map((e: any) => `${e.event_type}: ${e.path}`)
}

function startPolling() {
  if (poller) return
  poller = window.setInterval(handleFetchEventsFileSystem, 1000)
}

onUnmounted(async () => {
  if (poller) clearInterval(poller)

  if (watcherId.value) {
    await window.electronAPI.invoke('ai:request', {
      endpoint: `/api/file/observe/${watcherId.value}/stop`,
      method: 'POST',
    })
  }
})
</script>

<template>
  <header>
    <div class="w-full flex flex-col justify-center items-center">
      <button
        :disabled="!!watcherId"
        @click="handleStartWathingFilesSystem"
        class="border-none py-2 px-4 bg-indigo-300 rounded-full hover:bg-indigo-400 cursor-pointer"
      >
        Open files
      </button>
      <ul>
        <li v-for="file in files" :key="file">{{ file }}</li>
      </ul>
    </div>
  </header>

  <RouterView />
</template>
