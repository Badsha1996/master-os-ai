<script setup lang="ts">
import { ref, computed } from 'vue'

interface WatchedFolder {
  id: string
  path: string
  status: 'active' | 'stopped'
}

interface RecentChat {
  id: string
  title: string
  timestamp: string
}

interface Props {
  modelValue: boolean
  activeTab?: 'chat' | 'files' | 'metrics'
  watchedFolders?: WatchedFolder[]
}

const props = withDefaults(defineProps<Props>(), {
  activeTab: 'chat',
  watchedFolders: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'tab-change': [tab: 'chat' | 'files' | 'metrics']
  'watch-folder': []
  'stop-watcher': [id: string]
  'view-events': [id: string]
}>()

const currentTab = ref(props.activeTab)
const recentChats = ref<RecentChat[]>([
  { id: '1', title: 'Chat about AI Models', timestamp: '2 hours ago' },
  { id: '2', title: 'Code Review Session', timestamp: '5 hours ago' },
  { id: '3', title: 'File System Integration', timestamp: '1 day ago' },
])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const changeTab = (tab: 'chat' | 'files' | 'metrics') => {
  currentTab.value = tab
  emit('tab-change', tab)
}

const handleWatchFolder = () => {
  emit('watch-folder')
}

const handleStopWatcher = (id: string) => {
  emit('stop-watcher', id)
}

const handleViewEvents = (id: string) => {
  emit('view-events', id)
}
</script>

<template>
  <div
    :class="[
      'transition-all duration-300 bg-slate-900 border-r border-slate-800 flex flex-col h-screen overflow-hidden',
      isOpen ? 'w-80' : 'w-0',
    ]"
  >
    <!-- Header -->
    <div v-if="isOpen" class="p-4 border-b border-slate-800">
      <div class="flex items-center justify-between mb-4">
        <h2
          class="text-lg font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
        >
          Navigation
        </h2>
        <button
          @click="isOpen = false"
          class="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
          title="Close sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>

      <!-- Tab Navigation -->
      <div class="flex gap-2 bg-slate-800/50 p-1 rounded-lg">
        <button
          @click="changeTab('chat')"
          :class="[
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
            currentTab === 'chat'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'text-slate-400 hover:text-white',
          ]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Chat
        </button>
        <button
          @click="changeTab('files')"
          :class="[
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
            currentTab === 'files'
              ? 'bg-purple-500 text-white shadow-lg'
              : 'text-slate-400 hover:text-white',
          ]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
            ></path>
          </svg>
          Files
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <div v-if="isOpen" class="flex-1 overflow-y-auto p-4">
      <!-- Chat Tab -->
      <div v-if="currentTab === 'chat'" class="space-y-3">
        <h3 class="text-sm font-semibold text-slate-400 mb-3">Recent Chats</h3>
        <div
          v-for="chat in recentChats"
          :key="chat.id"
          class="p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors border border-slate-700/50"
        >
          <div class="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="text-blue-400 mt-0.5 flex-shrink-0"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ chat.title }}</p>
              <p class="text-xs text-slate-500 mt-1">{{ chat.timestamp }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Files Tab -->
      <div v-if="currentTab === 'files'" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-400">Watched Folders</h3>
          <button
            @click="handleWatchFolder"
            class="p-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
            title="Watch new folder"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="text-purple-400"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <!-- Empty State -->
        <div
          v-if="!watchedFolders || watchedFolders.length === 0"
          class="text-center py-8 text-slate-500 text-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="mx-auto mb-2 opacity-50"
          >
            <path
              d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
            ></path>
          </svg>
          <p>No folders being watched</p>
          <p class="text-xs mt-1">Click + to start watching</p>
        </div>

        <!-- Watched Folders List -->
        <div v-else class="space-y-2">
          <div
            v-for="folder in watchedFolders"
            :key="folder.id"
            class="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="text-purple-400 flex-shrink-0"
                  >
                    <path
                      d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                    ></path>
                  </svg>
                  <span class="text-xs font-medium truncate">{{ folder.path }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <div
                    :class="[
                      'w-1.5 h-1.5 rounded-full',
                      folder.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-gray-400',
                    ]"
                  />
                  <span class="text-xs text-slate-500">{{ folder.status }}</span>
                </div>
              </div>
              <div class="flex gap-1">
                <button
                  @click="handleViewEvents(folder.id)"
                  class="p-1.5 hover:bg-blue-500/20 rounded-lg transition-colors"
                  title="View events"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="text-blue-400"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                <button
                  @click="handleStopWatcher(folder.id)"
                  class="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Stop watching"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="text-red-400"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #1e293b;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>