import { ipcMain } from "electron";

type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  source?: string;
}

// ANSI color codes
const COLORS = {
  reset: "\x1b[0m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

export function registerLogHandlers() {
  ipcMain.handle("ui:log", (_event, payload: LogPayload) => {
    const { level, message, source } = payload;

    const basePrefix = source ? `[UI:${source}]` : "[UI]";

    let color = COLORS.blue;

    switch (level) {
      case "warn":
        color = COLORS.yellow;
        break;
      case "error":
        color = COLORS.red;
        break;
      case "info":
      default:
        color = COLORS.blue;
    }

    const coloredPrefix = `${color}${basePrefix}${COLORS.reset}`;

    switch (level) {
      case "warn":
        console.warn(coloredPrefix, message);
        break;
      case "error":
        console.error(coloredPrefix, message);
        break;
      default:
        console.log(coloredPrefix, message);
    }

    return { success: true };
  });
}
