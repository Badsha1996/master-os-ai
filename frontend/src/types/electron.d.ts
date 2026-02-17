import type {ElectronAPI} from "../../../electron/src/preload";
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}