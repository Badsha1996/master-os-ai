import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  dialog,
  globalShortcut,
  powerMonitor,
  screen,
} from "electron";
import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import { TrayManager, TrayStatus } from "./tray/trayManager";
import { CSP_NONCE, dirname, PYTHON_PORT, PYTHON_TOKEN, RUST_PORT } from "./constants";
import { setupSessionSecurity } from "./security/session";
import { ChildProcess, spawn } from "child_process";
import { SearchWindow } from "./windows/searchWindow";
import { checkPythonHealth } from "./sideCars/python/heath";
import { RustSidecar } from "./sideCars/rust/process";
import { fileURLToPath } from "url";

let mainWindow: BrowserWindow | null = null;
let inputWindow: SearchWindow | null = null;
let trayManager: TrayManager | null = null;

let pythonProcess: ChildProcess | null = null;
let rustProcess: RustSidecar | null = null;

let isQuitting = false;
function showWindow() {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
}

function toggleWindow() {
  if (!mainWindow) return;
  mainWindow.isVisible() ? mainWindow.hide() : showWindow();
}

async function createInputWindow() {
  if (inputWindow) return;

  try {
    inputWindow = new SearchWindow();

    await inputWindow.loadUI();
  } catch (err) {
    console.error("Failed to create input window:", err);

    if (inputWindow) {
      inputWindow.destroy();
    }

    inputWindow = null;
    throw err;
  }
}

async function toggleInputWindow() {
  if (!inputWindow) {
    await createInputWindow();
  }

  inputWindow?.toggle();
  inputWindow?.setSize(600, 60);
}

const HOTKEY_ACTIONS: Record<string, () => void> = {
  // "CommandOrControl+Shift+Space": toggleWindow,
  "CommandOrControl+Shift+K": toggleInputWindow,
};
function registerHotkeys() {
  for (const [key, handler] of Object.entries(HOTKEY_ACTIONS)) {
    const ok = globalShortcut.register(key, handler);
    if (!ok) console.warn("Failed to register hotkey:", key);
  }
}

async function createWindow() {
  await setupSessionSecurity();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.NODE_ENV === "development") {
    await mainWindow.loadURL("http://localhost:5173");
  } else if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(
      path.join(dirname, "../frontend/dist/index.html"),
    );
  }

  mainWindow.webContents.on("dom-ready", () => {
    mainWindow?.webContents.executeJavaScript(
      `window.__CSP_NONCE__ = "${CSP_NONCE}";`,
    );
  });

  await startSidecars();
  await checkPythonHealth();
}

async function startSidecars() {
  const backendDir = path.join(dirname, "../../backend");
  const pythonPath = path.join(backendDir, "venv", "Scripts", "python.exe");

  
  rustProcess = new RustSidecar(RUST_PORT);
  rustProcess.start();
  await rustProcess.waitUntilReady();

  console.log("🚀 Starting Python FastAPI server...");
  pythonProcess = spawn(
    pythonPath,
    [
      "-m",
      "uvicorn",
      "main:app",
      "--host",
      "127.0.0.1",
      "--port",
      String(PYTHON_PORT),
      "--log-level",
      "info",
    ],
    {
      cwd: backendDir,
      env: {
        ...process.env,
        PYTHON_TOKEN,
        RUST_URL: `http://127.0.0.1:${RUST_PORT}`,
        VIRTUAL_ENV: path.join(backendDir, "venv"),
        PATH: `${path.join(backendDir, "venv", "Scripts")};${process.env.PATH}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  if (pythonProcess.stdout) {
    pythonProcess.stdout.on("data", (data) => {
      console.log(`[Python] ${data.toString().trim()}`);
    });
  }

  if (pythonProcess.stderr) {
    pythonProcess.stderr.on("data", (data) => {
      console.error(`[Python Error] ${data.toString().trim()}`);
    });
  }

  pythonProcess.on("error", (err) => {
    console.error("❌ Python process error:", err);
  });

  pythonProcess.on("exit", (code) => {
    console.log(`Python process exited with code ${code}`);
  });

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/health`, {
        headers: { "x-token": PYTHON_TOKEN },
      });
      if (res.ok) {
        console.log("✅ Python server ready!");
        return;
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.error("❌ Python server failed to start");
  dialog.showErrorBox(
    "Server Start Failed",
    "Python backend did not respond in time",
  );
}

// IPC Handlers
ipcMain.handle("ai:request", async (_event, payload) => {
  const { target = "python", endpoint, method = "POST", body } = payload;
  const port = target === "rust" ? RUST_PORT : PYTHON_PORT;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);

    const res = await fetch(`http://127.0.0.1:${port}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-token": PYTHON_TOKEN,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Backend error: ${res.statusText} - ${errorText}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error(`IPC Request Failed [${endpoint}]:`, error.message);
    return { error: error.message || "Request failed" };
  }
});

ipcMain.handle("ai:request-stream", async (event, payload) => {
  const { endpoint, method = "POST", body } = payload;

  console.log(`📡 Stream request: ${endpoint}`);

  try {
    const response = await fetch(`http://127.0.0.1:${PYTHON_PORT}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-token": PYTHON_TOKEN,
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error: ${response.statusText} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error("Response body is empty");
    }

    let buffer = "";

    response.body.on("data", (chunk) => {
      buffer += chunk.toString();
      let boundary = buffer.indexOf("\n\n");

      while (boundary !== -1) {
        const evt = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);

        if (evt.startsWith("data:")) {
          const jsonStr = evt.slice(5).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            event.sender.send("ai:stream-data", parsed);
          } catch (e) {
            console.warn("Failed to parse SSE data:", jsonStr);
          }
        }
        boundary = buffer.indexOf("\n\n");
      }
    });

    response.body.on("end", () => {
      event.sender.send("ai:stream-end");
    });

    response.body.on("error", (err: Error) => {
      console.error("❌ Stream error:", err);
      event.sender.send("ai:stream-error", { error: err.message });
    });

    return { success: true };
  } catch (error: any) {
    console.error("❌ Stream setup failed:", error.message);
    event.sender.send("ai:stream-error", { error: error.message });
    return { error: error.message };
  }
});

ipcMain.handle("dialog:openFolder", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openDirectory", "multiSelections"],
  });
  return result.filePaths;
});
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
ipcMain.handle("input:resize-window", (_, height) => {
  inputWindow?.setSize(600, height);
});

ipcMain.handle("tray:set-status", (_e, status: TrayStatus) => {
  trayManager?.setIcon(status);
});

ipcMain.handle("tray:set-badge", (_e, count: number) => {
  app.setBadgeCount(count);
});
powerMonitor.on("resume", () => {
  mainWindow?.webContents.send("system:resume");
});

// Cleanup
app.on("before-quit", () => {
  console.log("🛑 Shutting down processes...");
  pythonProcess?.kill();
  rustProcess?.stop();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
app.whenReady().then(async () => {
  app.setLoginItemSettings({
    openAtLogin: true,
  });
  if (process.platform === "darwin") app.dock?.hide();
  await createWindow();
  trayManager = new TrayManager();
  registerHotkeys();
});
