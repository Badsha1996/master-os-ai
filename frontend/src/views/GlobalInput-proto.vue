<script setup lang="ts">
import { ref, shallowRef, onMounted, nextTick, watch } from 'vue'

/* ------------------ State ------------------ */
const inputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLUListElement | null>(null)
const query = ref('')
const results = shallowRef<string[]>([]) // Optimization: shallowRef for non-deep reactivity
const loading = ref(false)
const selectedIndex = ref(0) // For keyboard navigation

/* ------------------ Lifecycle ------------------ */
onMounted(() => {
  inputRef.value?.focus()
})

/* ------------------ Search Logic ------------------ */
let lastQuery = ''
let searchTimer: number | undefined

const handleSearch = (e: Event) => {
  const value = (e.target as HTMLInputElement).value
  query.value = value

  // Reset selection
  selectedIndex.value = 0
  
  clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => executeSearch(value), 250) // 250ms debounce
}

async function executeSearch(value: string) {
  if (!value.trim()) {
    results.value = []
    resizeWindow(0)
    return
  }

  if (value === lastQuery) return

  lastQuery = value
  loading.value = true

  try {
    // 1. Pre-expand window slightly to show loading state if needed
    // await window.electronAPI.searchBox.resize(600) 
    
    // 2. Fetch
    const res = await window.electronAPI.searchBox.search(value)
    
    // 3. Update data
    results.value = res.files || []
    
    // 4. Calculate Height & Resize Window
    // Base height (60px) + (Item Height (44px) * Count) + Padding
    const itemHeight = 44
    const listHeight = Math.min(results.value.length * itemHeight, 400) // Max height cap
    const totalHeight = 60 + (results.value.length > 0 ? listHeight + 16 : 0)
    
    resizeWindow(totalHeight)

  } catch (err) {
    console.error('Search failed', err)
    results.value = []
    resizeWindow(60)
  } finally {
    loading.value = false
  }
}

function resizeWindow(height: number) {
   // Fallback to standard height if 0 passed
   const h = height > 0 ? height : 60
   window.electronAPI.searchBox.resize(h)
}

/* ------------------ Navigation & Actions ------------------ */
async function openItem(item: string) {
  if (!item) return
  // Visual feedback before close
  const el = document.querySelector('.selected') as HTMLElement
  if (el) el.style.transform = 'scale(0.98)'
  
  setTimeout(async () => {
    console.log('Opening:', item)
    await window.electronAPI.files.openItem(item)
    // Optional: Reset query or close window handled by main process
  }, 100)
}

function onKeydown(e: KeyboardEvent) {
  if (results.value.length === 0) {
    if (e.key === 'Escape') window.close()
    return
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % results.value.length
      scrollToSelected()
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value = (selectedIndex.value - 1 + results.value.length) % results.value.length
      scrollToSelected()
      break
    case 'Enter':
      e.preventDefault()
      openItem(results.value[selectedIndex.value])
      break
    case 'Escape':
      e.preventDefault()
      window.close()
      break
  }
}

function scrollToSelected() {
  nextTick(() => {
    const el = listRef.value?.children[selectedIndex.value] as HTMLElement
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  })
}
</script>

<template>
  <div class="glass-panel">
    <div class="input-wrapper">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        ref="inputRef"
        :value="query"
        placeholder="Search Master-OS..."
        spellcheck="false"
        autocomplete="off"
        @input="handleSearch"
        @keydown="onKeydown"
      />
      <div v-if="loading" class="spinner-mini"></div>
    </div>

    <ul 
      v-if="results.length" 
      ref="listRef" 
      class="results-list"
    >
      <div class="separator"></div>
      <li
        v-for="(item, i) in results"
        :key="i"
        class="result-item"
        :class="{ selected: i === selectedIndex }"
        @click="openItem(item)"
        @mouseenter="selectedIndex = i"
      >
        <div class="icon-placeholder">📄</div> <span class="text-content">{{ item }}</span>
        <span v-if="i === selectedIndex" class="enter-hint">↵</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* ------------------ Base Layout ------------------ */
.glass-panel {
  width: 100%;
  height: 100vh; /* Occupy full webview height */
  display: flex;
  flex-direction: column;
  
  /* The iOS Glass Effect */
  background: rgba(28, 28, 30, 0.65);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
    
  border-radius: 12px;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #fff;
}

/* ------------------ Input Section ------------------ */
.input-wrapper {
  position: relative;
  flex-shrink: 0; /* Prevents shrinking */
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.search-icon {
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.4);
  margin-right: 12px;
}

input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 20px;
  font-weight: 400;
  caret-color: #0A84FF; /* iOS Blue */
}

input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

/* ------------------ Mini Loading Spinner ------------------ */
.spinner-mini {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #0A84FF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ------------------ Results List ------------------ */
.separator {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 0 16px 8px 16px;
}

.results-list {
  flex: 1;
  list-style: none;
  margin: 0;
  padding: 0 8px 8px 8px;
  overflow-y: auto;
  
  /* Scrollbar Hiding Techniques */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.results-list::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

/* ------------------ Result Item ------------------ */
.result-item {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 12px;
  margin-bottom: 2px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}

/* Icons */
.icon-placeholder {
  margin-right: 12px;
  font-size: 16px;
  opacity: 0.7;
}

.text-content {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ------------------ Active/Selected State ------------------ */
.result-item.selected {
  background: rgba(0, 122, 255, 0.8); /* iOS Blue active state */
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Enter Hint (Visual cue) */
.enter-hint {
  font-size: 10px;
  font-weight: 600;
  opacity: 0.7;
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>