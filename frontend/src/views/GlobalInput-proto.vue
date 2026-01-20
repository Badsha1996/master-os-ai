<script setup lang="ts">
import { ref, onMounted } from 'vue'

/* ------------------ refs ------------------ */
const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const results = ref<any[]>([])
const loading = ref(false)

/* ------------------ focus input ------------------ */
onMounted(() => {
  inputRef.value?.focus()
})

/* ------------------ debounce + throttle ------------------ */
function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300) {
  let timer: number | undefined
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), delay)
  }
}

function throttle<T extends (...args: any[]) => void>(fn: T, limit = 800) {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/* ------------------ API call ------------------ */
async function fetchResults(value: string) {
  if (!value.trim()) {
    results.value = []
    return
  }

  loading.value = true
  try {
    await window.electronAPI.searchBox.resize(600)
    const res = await window.electronAPI.searchBox.search(query.value)
    results.value = res.files
  } catch (err: any) {
    window.alert(err.message)
    console.error(err)
    results.value = []
  } finally {
    loading.value = false
  }
}

/* ------------------ combined handler ------------------ */
const debouncedThrottledFetch = debounce(throttle(fetchResults, 1000), 300)

/* ------------------ input handler ------------------ */
function onInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  query.value = value
  debouncedThrottledFetch(value)
}

/* ------------------ esc key ------------------ */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    window.close()
  }
}
async function handleItemClick(item: string) {
  console.log(item)
  await window.electronAPI.files.openItem(item)
}
</script>

<template>
  <div class="command-container">
    <input
      ref="inputRef"
      :value="query"
      placeholder="Type a command or open a file…"
      @input="onInput"
      @keydown="onKeydown"
    />

    <!-- loading -->
    <div v-if="loading || results.length" class="wrapper">
      <!-- Loader -->
      <div v-if="loading" class="loader">
        <span class="spinner"></span>
        <span class="text">Loading…</span>
      </div>

      <!-- Results -->
      <ul v-else class="results">
        <li
          v-for="(item, i) in results"
          :key="i"
          class="result-item"
          @click="handleItemClick(item)"
        >
          {{ item }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.command-container {
  min-height: 60px;
  padding: 12px 16px;
  border-radius: 14px;
  position: relative;

  backdrop-filter: blur(16px);
  background: rgb(18, 22, 38);
  /* background-color: red; */

  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}

input {
  position: absolute;
  top: 0;
  width: 100%;
  height: 60px;
  font-size: 18px;

  background: transparent;
  border: none;
  outline: none;
  color: white;
}
.wrapper {
  margin-top: 60px;
  background: rgba(20, 20, 30, 0.95);
  border-radius: 10px;
  overflow: hidden;
}

/* ---------- Loader ---------- */
.loader {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #cbd5f5;
  font-size: 14px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #8ab4ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---------- Results ---------- */
.results {
  max-height: 240px;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 6px;
}

.result-item {
  padding: 10px 12px;
  border-radius: 8px;
  color: #e5e7eb;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.result-item:hover {
  background: rgba(138, 180, 255, 0.15);
}
</style>
