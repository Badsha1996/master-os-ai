import { ipcMain } from "electron";
import { SearchWindowContext } from "./types";

export function registerSearchBoxHandlers(ctx: SearchWindowContext) {
  ipcMain.handle("input:resize-window", (_, height) => {
    ctx.getInputWindow()?.setSize(600, height);
  });
}
