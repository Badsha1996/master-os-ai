import { AppWindow } from "../windows/appWindow";
import { SearchWindow } from "../windows/searchWindow";
import { TrayManager } from "../tray/trayManager";

export interface MainWindowContext {
  getMainWindow: () => AppWindow | null;
}

export interface SearchWindowContext {
  getInputWindow: () => SearchWindow | null;
}

export interface TrayContext {
  getTrayManager: () => TrayManager | null;
}