type AIRequest = {
  endpoint: string
  method?: 'GET' | 'POST'
  body?: unknown
}

type InvokeChannel = 'ai:request' | 'ai:cancel' | 'dialog:openFile' | 'dialog:openFolder'

interface InvokeChannelDataMap {
  'ai:request': AIRequest
  'ai:cancel': any
  'dialog:openFolder'?: undefined
}

type OnChannel = 'ai:response' | 'ai:status'

declare global {
  interface Window {
    electronAPI: {
      invoke: <T extends InvokeChannel>(channel: T, data?: InvokeChannelDataMap[T]) => Promise<any>
      on: (channel: OnChannel, callback: (data: any) => void) => () => void
    }
  }
}

export interface IElectronAPI {
  [key: string]: any
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}

export {}
