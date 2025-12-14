type AIRequest = {
  endpoint: string
  method?: 'GET' | 'POST'
  body?: unknown
}

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: 'ai:request', data: AIRequest) => Promise<any>
      on: (channel: 'ai:response' | 'ai:status', callback: (data: any) => void) => () => void
    }
  }
}
