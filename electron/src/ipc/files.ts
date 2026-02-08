import { ipcMain, shell } from "electron";
import fs from "fs";
import { PYTHON_PORT, PYTHON_TOKEN } from "../constants";

export function registerFileHandlers() {
  ipcMain.handle("file:search", async (_event, payload) => {
    const { endpoint, method = "POST", query } = payload;
    try {
      const res = await fetch(
        `http://127.0.0.1:${PYTHON_PORT}${endpoint}?file_name=${query}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            "x-token": PYTHON_TOKEN,
          },
        },
      );
      if (!res.ok) throw new Error(`Backend error: ${res.statusText}`);
      return await res.json();
    } catch (error: any) {
      console.error("❌ Stream setup failed:", error.message);
      return { error: error.message };
    }
  });
  ipcMain.handle("open:path", async (_, targetPath: string) => {
    try {
      if (!fs.existsSync(targetPath)) {
        throw new Error(`Path does not exist  ${targetPath}`);
      }

      const stat = fs.statSync(targetPath);

      if (stat.isFile()) {
        // 📄 Open file with default app
        await shell.openPath(targetPath);
      } else if (stat.isDirectory()) {
        // 📁 Open directory in file explorer
        await shell.openPath(targetPath);
      }

      return { success: true };
    } catch (err: any) {
      console.log(err);
      return { success: false, error: err.message };
    }
  });
}
