<template>
  <div class="chat-container">
    <div class="chat-header">
      <div class="header-content">
        <h1>🤖 Master-OS</h1>
        <div class="status-badge" :class="statusClass">
          <span class="status-dot"></span>
          {{ statusText }}
        </div>
      </div>
    </div>

    <div class="messages-container" ref="messagesContainer">
      <div v-for="(msg, idx) in messages" :key="idx" class="message-wrapper">
        
        <div v-if="msg.role === 'user'" class="message user-message">
          <div class="message-content">{{ msg.content }}</div>
        </div>

        <div v-else class="message assistant-message">
          
          <div v-if="msg.thoughts && msg.thoughts.length > 0" class="react-section thoughts">
            <div class="section-header">
              <span class="icon">💭</span>
              <span class="title">Thinking Process</span>
            </div>
            <div class="section-content">
              <div v-for="(thought, tidx) in msg.thoughts" :key="tidx" class="thought-item">
                {{ thought }}
              </div>
            </div>
          </div>

          <div v-if="msg.actions && msg.actions.length > 0" class="react-section actions">
            <div class="section-header">
              <span class="icon">⚡</span>
              <span class="title">Tool Executions</span>
            </div>
            <div class="section-content">
              <div v-for="(action, aidx) in msg.actions" :key="aidx" class="action-item">
                <div class="action-header">
                  <span class="tool-name">{{ action.tool }}</span>
                  <span class="tool-status" v-if="action.output">✅</span>
                  <span class="tool-status loading" v-else>⏳</span>
                </div>
                
                <div class="action-params" v-if="Object.keys(action.params).length">
                  <code>{{ formatParams(action.params) }}</code>
                </div>

                <div v-if="action.output" class="action-observation">
                  <span class="obs-label">Result:</span>
                  <span class="obs-content">{{ action.output }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="msg.answer" class="react-section answer">
            <div class="section-header">
              <span class="icon">✨</span>
              <span class="title">Response</span>
            </div>
            <div class="section-content whitespace-pre-wrap">
              {{ msg.answer }}
            </div>
          </div>

          <div v-if="msg.isGenerating" class="loading-indicator">
            <div class="spinner"></div>
            <span class="phase-text">{{ currentPhase }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="input-container">
      <textarea
        v-model="userInput"
        @keydown.enter.exact.prevent="sendMessage"
        placeholder="Ask Master-OS to do something..."
        rows="1"
        ref="inputRef"
        :disabled="isGenerating"
        @input="autoResize"
      ></textarea>
      <div class="input-actions">
        <button 
          v-if="isGenerating" 
          @click="cancelGeneration" 
          class="btn btn-cancel"
        >
          ⏹️ Stop
        </button>
        <button 
          v-else
          @click="sendMessage" 
          :disabled="!userInput.trim()"
          class="btn btn-send"
        >
          🚀
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';

// --- Types ---
interface ActionLog {
  tool: string;
  params: Record<string, any>;
  output?: string; // We store the observation directly on the action now
}

interface Message {
  role: 'user' | 'assistant';
  content?: string;
  thoughts: string[];
  actions: ActionLog[];
  answer?: string;
  isGenerating?: boolean;
}

// --- State ---
const messages = ref<Message[]>([]);
const userInput = ref('');
const isGenerating = ref(false);
const currentPhase = ref('Ready');
const modelStatus = ref<'loaded' | 'loading' | 'offline'>('offline');
const messagesContainer = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);

// --- Computed ---
const statusClass = computed(() => `status-${modelStatus.value}`);
const statusText = computed(() => {
  if (modelStatus.value === 'loaded') return 'System Online';
  if (modelStatus.value === 'loading') return 'Initializing Model...';
  return 'System Offline';
});

// --- Logic ---

const autoResize = () => {
  if (inputRef.value) {
    inputRef.value.style.height = 'auto';
    inputRef.value.style.height = inputRef.value.scrollHeight + 'px';
  }
};

const formatParams = (params: Record<string, any>) => JSON.stringify(params).replace(/"/g, '');

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

const checkStatus = async () => {
  try {
    // Ensure your Electron preload exposes this
    const result = await window.electronAPI.chat.getStatus(); 
    modelStatus.value = result.model_loaded ? 'loaded' : 'offline';
  } catch (error) {
    console.warn('Backend unavailable:', error);
    modelStatus.value = 'offline';
  }
};

const sendMessage = async () => {
  const text = userInput.value.trim();
  if (!text || isGenerating.value) return;

  // 1. Add User Message
  messages.value.push({ role: 'user', content: text, thoughts: [], actions: [] });
  userInput.value = '';
  if (inputRef.value) inputRef.value.style.height = 'auto';

  // 2. Prepare Assistant Message
  const assistantMsg: Message = {
    role: 'assistant',
    thoughts: [],
    actions: [],
    answer: '',
    isGenerating: true,
  };
  messages.value.push(assistantMsg);
  
  isGenerating.value = true;
  currentPhase.value = "Thinking...";
  scrollToBottom();

  // 3. Track state for logic
  let lastPhase = 'start'; 

  try {
    // Listeners
    const removeData = window.electronAPI.on('ai:stream-data', (event: any) => {
      handleStreamEvent(event, assistantMsg, lastPhase);
      // Update local phase tracker
      if (event.type === 'phase') lastPhase = event.phase;
      scrollToBottom();
    });

    const removeEnd = window.electronAPI.on('ai:stream-end', () => {
      cleanup('Complete');
    });

    const removeError = window.electronAPI.on('ai:stream-error', (err: any) => {
      console.error(err);
      assistantMsg.answer += `\n[System Error: ${err.error || 'Unknown'}]`;
      cleanup('Error');
    });

    // Start Stream
    await window.electronAPI.chat.stream(text, 0.7, 2048);

    // Cleanup Helper
    const cleanup = (finalPhase: string) => {
      removeData(); removeEnd(); removeError();
      assistantMsg.isGenerating = false;
      isGenerating.value = false;
      currentPhase.value = finalPhase;
    };

  } catch (e) {
    console.error(e);
    assistantMsg.answer = "Failed to connect to AI Service.";
    assistantMsg.isGenerating = false;
    isGenerating.value = false;
  }
};

// --- Core Event Handler ---
const handleStreamEvent = (event: any, msg: Message, lastPhase: string) => {
  switch (event.type) {
    case 'status':
      currentPhase.value = event.status;
      break;

    case 'phase':
      // Visual feedback of what the model is doing
      if (event.phase === 'thinking') currentPhase.value = "Thinking...";
      if (event.phase === 'action') currentPhase.value = "Preparing Tool...";
      
      // LOGIC: If we switch back to thinking AFTER an action, 
      // we should probably start a new thought bubble to separate steps.
      if (event.phase === 'thinking' && msg.actions.length > 0) {
        msg.thoughts.push(""); // Start new thought block
      }
      break;

    case 'thought':
      // Initialize if empty
      if (msg.thoughts.length === 0) msg.thoughts.push("");
      
      // Append text to the *latest* thought bubble
      const lastIdx = msg.thoughts.length - 1;
      msg.thoughts[lastIdx] += event.text;
      break;

    case 'action':
      // Add new action entry
      msg.actions.push({
        tool: event.tool,
        params: event.params,
        output: undefined // Pending
      });
      currentPhase.value = `Executing: ${event.tool}`;
      break;

    case 'observation':
      // Attach observation to the LAST executed action
      if (msg.actions.length > 0) {
        const lastAction = msg.actions[msg.actions.length - 1];
        lastAction.output = (lastAction.output || "") + event.text;
      }
      break;

    case 'done':
      // Stream the final answer
      msg.answer = (msg.answer || "") + event.answer;
      break;

    case 'cancelled':
      msg.answer += " [Cancelled]";
      break;
  }
};

const cancelGeneration = async () => {
  // Ensure your backend has this route, or handle it via Electron
  await window.electronAPI.invoke('ai:request', { 
    endpoint: '/chat/cancel', // Updated to match likely router prefix
    method: 'POST' 
  });
  isGenerating.value = false;
  currentPhase.value = "Cancelled";
};

onMounted(() => {
  checkStatus();
});
</script>

<style scoped>
/* Main Container */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f3f4f6; /* Light gray bg */
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Header */
.chat-header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 1.5rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.chat-header h1 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 9999px;
  background: #f3f4f6;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #9ca3af;
}

.status-loaded .status-dot { background-color: #10b981; box-shadow: 0 0 8px #10b981; }
.status-loaded { color: #065f46; background: #d1fae5; }

.status-offline .status-dot { background-color: #ef4444; }
.status-offline { color: #991b1b; background: #fee2e2; }

/* Messages Area */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  scroll-behavior: smooth;
}

.message-wrapper {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
}

.message {
  max-width: 85%;
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.user-message {
  margin-left: auto;
  background: #4f46e5;
  color: white;
  border-bottom-right-radius: 4px;
}

.assistant-message {
  margin-right: auto;
  background: white;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 4px;
  width: 100%;
}

/* ReAct Sections */
.react-section {
  margin-bottom: 1.5rem;
  border-left: 2px solid #e5e7eb;
  padding-left: 1rem;
}

.react-section:last-child { margin-bottom: 0; }

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

/* Thoughts */
.thought-item {
  font-size: 0.95rem;
  color: #4b5563;
  margin-bottom: 0.5rem;
  line-height: 1.6;
  font-style: italic;
}

/* Actions */
.action-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.tool-name {
  font-family: monospace;
  font-weight: 700;
  color: #d946ef; /* Magenta for tools */
}

.action-params code {
  font-family: monospace;
  font-size: 0.8rem;
  color: #6b7280;
  word-break: break-all;
}

.action-observation {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e5e7eb;
  font-size: 0.9rem;
  color: #374151;
}

.obs-label {
  font-weight: 600;
  font-size: 0.75rem;
  color: #10b981;
  margin-right: 6px;
}

/* Final Answer */
.answer .section-content {
  color: #111827;
  font-size: 1rem;
  line-height: 1.6;
}

.whitespace-pre-wrap {
  white-space: pre-wrap;
}

/* Loading */
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Input Area */
.input-container {
  background: white;
  border-top: 1px solid #e5e7eb;
  padding: 1.5rem;
}

.input-container textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  resize: none;
  font-family: inherit;
  font-size: 1rem;
  outline: none;
  max-height: 150px;
  box-sizing: border-box; 
  /* Important for width: 100% to not overflow */
}

.input-container textarea:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-send { background: #4f46e5; color: white; }
.btn-send:hover { background: #4338ca; }
.btn-send:disabled { background: #e5e7eb; cursor: not-allowed; }

.btn-cancel { background: #fee2e2; color: #ef4444; }
.btn-cancel:hover { background: #fecaca; }
</style>