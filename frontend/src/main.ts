import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

const meta = document.querySelector('meta[name="csp-nonce"]')
if (meta && (window as any).__CSP_NONCE__) {
  meta.setAttribute('content', (window as any).__CSP_NONCE__)
}

app.mount('#app')
