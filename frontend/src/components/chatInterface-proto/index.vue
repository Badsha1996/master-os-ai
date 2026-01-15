<script setup lang="ts">
import { ref, onUnmounted } from 'vue';

interface SystemAction {
  tool: string;
  params: Record<string, any>;
  result: string;
  id: number;
  timestamp: string;
}

interface AgentState {
  thinking: string;
  response: string;
  actions: SystemAction[];
  phase: 'idle' | 'thinking' | 'executing' | 'responding' | 'error';
  error?: string;
}

const inputQuery = ref('');
const agentState = ref<AgentState>({ 
  thinking: '', 
  response: '', 
  actions: [], 
  phase: 'idle' 
});

const isProcessing = ref(false);

onUnmounted(() => {
  window.electronAPI.removeAllStreamListeners();
});

const startChat = async () => {
  if (!inputQuery.value.trim() || isProcessing.value) return;

  // Reset state for new request
  agentState.value = { 
    thinking: '', 
    response: '', 
    actions: [], 
    phase: 'thinking',
    error: undefined
  };
  
  isProcessing.value = true;
  window.electronAPI.removeAllStreamListeners();

  // Listen for stream events
  window.electronAPI.on('ai:stream-data', (payload: any) => {
    const { type } = payload;

    switch (type) {
      case 'status':
        console.log('Status:', payload.status);
        break;

      case 'phase':
        agentState.value.phase = payload.phase;
        break;

      case 'thinking':
        // Complete thinking content received
        agentState.value.thinking = payload.content;
        break;

      case 'thinking_chunk':
        // Incremental thinking update
        agentState.value.thinking += payload.text;
        break;

      case 'action_result':
        // Tool execution completed
        agentState.value.actions.push({
          tool: payload.tool,
          params: payload.params || {},
          result: payload.result,
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString()
        });
        break;

      case 'action_error':
        console.error('Action error:', payload.error);
        agentState.value.actions.push({
          tool: 'error',
          params: {},
          result: `Error: ${payload.error}`,
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString()
        });
        break;

      case 'response':
        // Final response text streaming
        agentState.value.response += payload.text;
        agentState.value.phase = 'responding';
        break;

      case 'done':
        agentState.value.phase = 'idle';
        isProcessing.value = false;
        console.log('✅ Generation complete');
        break;

      case 'cancelled':
        agentState.value.phase = 'idle';
        isProcessing.value = false;
        agentState.value.error = 'Generation cancelled';
        break;

      case 'error':
        agentState.value.phase = 'error';
        isProcessing.value = false;
        agentState.value.error = payload.error;
        console.error('Stream error:', payload.error);
        break;
    }
  });

  window.electronAPI.on('ai:stream-error', (err: any) => {
    agentState.value.phase = 'error';
    agentState.value.error = err.error || 'Unknown error';
    isProcessing.value = false;
  });

  window.electronAPI.on('ai:stream-end', () => {
    if (agentState.value.phase !== 'error') {
      agentState.value.phase = 'idle';
    }
    isProcessing.value = false;
  });

  try {
    await window.electronAPI.chat.stream(inputQuery.value);
    inputQuery.value = '';
  } catch (err: any) {
    agentState.value.phase = 'error';
    agentState.value.error = err.message || 'Failed to start stream';
    isProcessing.value = false;
  }
};

const cancelGeneration = async () => {
  try {
    await window.electronAPI.invoke('ai:request', {
      endpoint: '/api/chat/cancel',
      method: 'POST'
    });
    agentState.value.phase = 'idle';
    isProcessing.value = false;
  } catch (err) {
    console.error('Cancel failed:', err);
  }
};

const getPhaseDisplay = () => {
  switch (agentState.value.phase) {
    case 'thinking': return '🧠 Thinking...';
    case 'executing': return '⚙️ Executing...';
    case 'responding': return '💬 Responding...';
    case 'error': return '❌ Error';
    default: return '✓ Ready';
  }
};

const getPhaseColor = () => {
  switch (agentState.value.phase) {
    case 'thinking': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'executing': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'responding': return 'bg-green-50 text-green-700 border-green-200';
    case 'error': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};
</script>

<template>
  <div class="max-w-5xl mx-auto p-6 font-sans pb-40">
    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Master-OS</h1>
        <p class="text-xs text-gray-500 uppercase tracking-widest mt-1">Neural Orchestrator v2.0</p>
      </div>
      <div :class="['px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border transition-all', getPhaseColor()]">
        <span v-if="agentState.phase !== 'idle'" class="h-2 w-2 bg-current rounded-full animate-pulse"></span>
        <span v-else class="h-2 w-2 bg-current rounded-full"></span>
        {{ getPhaseDisplay() }}
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="agentState.error" class="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="font-semibold">Error:</span>
        <span>{{ agentState.error }}</span>
      </div>
    </div>

    <!-- Thinking Block -->
    <div v-if="agentState.thinking" class="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
      <div class="bg-slate-900 rounded-xl p-5 shadow-xl border border-slate-700">
        <div class="flex items-center gap-2 mb-3">
          <div class="flex gap-1">
            <div class="w-2 h-2 rounded-full bg-red-500/60"></div>
            <div class="w-2 h-2 rounded-full bg-yellow-500/60"></div>
            <div class="w-2 h-2 rounded-full bg-green-500/60"></div>
          </div>
          <span class="text-[10px] text-slate-400 font-mono ml-2 uppercase tracking-wider">Reasoning Engine</span>
        </div>
        <p class="text-sm font-mono text-blue-300 leading-relaxed whitespace-pre-wrap">
          {{ agentState.thinking }}<span v-if="agentState.phase === 'thinking'" class="animate-pulse ml-1">▋</span>
        </p>
      </div>
    </div>

    <!-- Actions Block -->
    <div v-if="agentState.actions.length > 0" class="space-y-3 mb-6">
      <div v-for="action in agentState.actions" :key="action.id" 
           :class="['border px-5 py-4 rounded-xl flex items-start gap-4 animate-in slide-in-from-left-4 duration-300',
                    action.tool === 'error' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200']">
        <div :class="['p-2 rounded-lg flex-shrink-0', action.tool === 'error' ? 'bg-red-500' : 'bg-emerald-500']">
          <svg v-if="action.tool !== 'error'" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
          </svg>
          <svg v-else class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline gap-2 mb-1">
            <p :class="['text-[10px] uppercase font-bold tracking-wider', 
                       action.tool === 'error' ? 'text-red-600' : 'text-emerald-600']">
              {{ action.tool }} 
            </p>
            <span class="text-[9px] text-gray-400">{{ action.timestamp }}</span>
          </div>
          <p v-if="Object.keys(action.params).length > 0" class="text-xs text-gray-600 mb-1 font-mono">
            {{ JSON.stringify(action.params) }}
          </p>
          <p :class="['text-sm font-medium break-words', action.tool === 'error' ? 'text-red-800' : 'text-emerald-800']">
            {{ action.result }}
          </p>
        </div>
      </div>
    </div>

    <!-- Response Block -->
    <div v-if="agentState.response" class="bg-white border border-gray-200 rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-500">
      <p class="text-gray-800 whitespace-pre-wrap leading-relaxed text-lg tracking-tight">
        {{ agentState.response }}<span v-if="agentState.phase === 'responding'" class="animate-pulse ml-1">▋</span>
      </p>
    </div>

    <!-- Input Area (Fixed Bottom) -->
    <div class="fixed bottom-8 left-0 right-0 px-6 z-10">
      <div class="max-w-5xl mx-auto">
        <div class="flex gap-3 bg-white/95 backdrop-blur-xl p-3 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-200">
          <input 
            v-model="inputQuery" 
            @keyup.enter="startChat"
            class="flex-1 bg-transparent px-4 py-3 outline-none text-gray-800 text-base placeholder-gray-400"
            placeholder="What should Master-OS do?"
            :disabled="isProcessing"
          />
          <button 
            v-if="!isProcessing"
            @click="startChat"
            :disabled="!inputQuery.trim()"
            class="bg-black hover:bg-zinc-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl transition-all font-bold text-sm shadow-lg hover:shadow-xl"
          >
            EXECUTE
          </button>
          <button 
            v-else
            @click="cancelGeneration"
            class="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl transition-all font-bold text-sm shadow-lg"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-in-from-top-4 {
  from {
    opacity: 0;
    transform: translateY(-1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-in-from-left-4 {
  from {
    opacity: 0;
    transform: translateX(-1rem);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes zoom-in-95 {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-in {
  animation-fill-mode: both;
}

.duration-300 {
  animation-duration: 300ms;
}

.duration-500 {
  animation-duration: 500ms;
}
</style>