<script setup lang="ts">
import { ref, onMounted } from "vue";

const inputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  inputRef.value?.focus();
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    window.close(); // triggers blur → Electron hides window
  }
}
</script>

<template>
  <div class="command-container">
    <input
      ref="inputRef"
      placeholder="Type a command or open a file…"
      @keydown="onKeydown"
    />
  </div>
</template>

<style scoped>
.command-container {
  height: 100%;
  padding: 12px 16px;
  border-radius: 14px;

  backdrop-filter: blur(16px);
  background: rgba(20, 20, 20, 0.85);

  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}

input {
  width: 100%;
  height: 100%;
  font-size: 18px;

  background: transparent;
  border: none;
  outline: none;
  color: white;
}
</style>
