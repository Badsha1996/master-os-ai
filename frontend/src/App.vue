<script setup lang="ts">
import { ref, type Ref } from 'vue'
import { RouterView } from 'vue-router'

const testEvent = ref<string[]>([])

// test function
async function handleTest() {
  const result = await window.electronAPI.invoke('ai:request', {
    endpoint: '/test',
    method: 'GET',
  })

  testEvent.value = result.tested
}
</script>

<template>
  <header>
    <div class="w-full flex justify-center items-center">
      <button
        @click="handleTest"
        class="border-none py-2 px-4 bg-indigo-300 rounded-full hover:bg-indigo-400 cursor-pointer"
      >
        Test It
      </button>
      <ul>
        <li v-for="event in testEvent">{{ event }}</li>
      </ul>
    </div>
  </header>

  <RouterView />
</template>
