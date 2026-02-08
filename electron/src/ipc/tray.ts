import { app, ipcMain } from "electron";
import { TrayStatus } from "../tray/trayManager";
import { TrayContext } from "./types";

export function registerTrayHandlers(ctx: TrayContext) {
  ipcMain.handle("tray:set-status", (_e, status: TrayStatus) => {
    ctx.getTrayManager()?.setIcon(status);
  });

  ipcMain.handle("tray:set-badge", (_e, count: number) => {
    app.setBadgeCount(count);
  });
}
