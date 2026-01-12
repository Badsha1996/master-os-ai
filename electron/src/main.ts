import {
  app,
  BrowserWindow,
  session,
  shell,
  ipcMain,
  dialog,
  Tray,
  Menu,
  globalShortcut,
  nativeImage,
  powerMonitor,
  screen
} from "electron";
import { spawn, ChildProcess } from "child_process";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import path from "path";
import fetch from "node-fetch";

let mainWindow: BrowserWindow | null = null;
let inputWindow: BrowserWindow | null = null;

let viteProcess: ChildProcess | null = null;
let pythonProcess: ChildProcess | null = null;
let rustProcess: ChildProcess | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const PYTHON_TOKEN = "54321";
const PYTHON_PORT = 8000;
const RUST_PORT = 5005;
const CSP_NONCE = randomBytes(16).toString("base64");

type TrayStatus = "idle" | "thinking" | "error";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupSessionSecurity() {
  const isDev = !app.isPackaged;
  const styleSrc = isDev
    ? "'self' 'unsafe-inline'"
    : `'self' 'nonce-${CSP_NONCE}'`;

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self'",
          `style-src ${styleSrc}`,
          "img-src 'self' data:",
          `connect-src 'self' http://127.0.0.1:${PYTHON_PORT} http://127.0.0.1:${RUST_PORT}`,
        ].join("; "),
      },
    });
  });
}
function getTrayIcon(status: TrayStatus) {
  return nativeImage.createFromPath(
    path.join(process.cwd(), "assets", `tray.png`)
  );
}
function showWindow() {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
}

function toggleWindow() {
  if (!mainWindow) return;
  mainWindow.isVisible() ? mainWindow.hide() : showWindow();
}
function createTray() {
  tray = new Tray(getTrayIcon("idle"));

  const menu = Menu.buildFromTemplate([
    { label: "Show", click: showWindow },
    {
      label: "Settings",
      click: () => {
        showWindow();
        mainWindow?.webContents.send("ui:open-setting");
      },
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setToolTip("Master OS AI");
  tray.setContextMenu(menu);
  tray.on("click", toggleWindow);
}
async function createInputWindow() {
  if (inputWindow && !inputWindow.isDestroyed()) return;

  try {
    const { width } = screen.getPrimaryDisplay().workAreaSize;

    inputWindow = new BrowserWindow({
      width: 600,
      height: 60,
      x: Math.floor((width - 600) / 2),
      y: 40,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      focusable: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        sandbox: true,
      },
    });

    inputWindow.on("close", (e) => {
      e.preventDefault();
      inputWindow?.hide();
    });

    inputWindow.on("blur", () => {
      inputWindow?.hide();
    });

    if (process.env.NODE_ENV === "development") {
      await inputWindow.loadURL("http://localhost:5173/command");
    } else if (process.env.VITE_DEV_SERVER_URL) {
      await inputWindow.loadURL(process.env.VITE_DEV_SERVER_URL + "/command");
    } else {
      await inputWindow.loadFile(
        path.join(__dirname, "../frontend/dist/index.html"),
        { search: "?route=command" }
      );
    }
  } catch (err) {
    console.error("Failed to create input window:", err);

    if (inputWindow && !inputWindow.isDestroyed()) {
      inputWindow.destroy();
    }

    inputWindow = null;
    throw err; // let caller decide
  }
}

async function toggleInputWindow() {
  if (!inputWindow || inputWindow.isDestroyed()) {
    await createInputWindow();
  }

  if (inputWindow!.isVisible()) {
    inputWindow!.hide();
  } else {
    inputWindow!.show();
    inputWindow!.focus();
  }
}
const HOTKEY_ACTIONS: Record<string, () => void> = {
  "CommandOrControl+Shift+Space": toggleWindow,
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
      preload: path.join(__dirname, "preload.cjs"),
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

  // Load Frontend
  if (process.env.NODE_ENV === "development") {
    await mainWindow.loadURL("http://localhost:5173");
  } else if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(
      path.join(__dirname, "../frontend/dist/index.html")
    );
  }

  mainWindow.webContents.on("dom-ready", () => {
    mainWindow?.webContents.executeJavaScript(
      `window.__CSP_NONCE__ = "${CSP_NONCE}";`
    );
  });

  // Start both sidecars in sequence (PYTHON + RUST)
  await startSidecars();
  await checkHealth();
}

async function startFrontendDevServer() {
  if (process.env.NODE_ENV !== "development") return;

  const frontendDir = path.join(__dirname, "../../frontend");

  console.log("🚀 Starting Vite dev server...");

  viteProcess = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "dev"],
    {
      cwd: frontendDir,
      stdio: "inherit",
      env: {
        ...process.env,
        BROWSER: "none", // prevent auto browser open
      },
    }
  );

  viteProcess.on("error", (err) => {
    console.error("❌ Failed to start Vite:", err);
  });
}

async function startSidecars() {
  const backendDir = path.join(__dirname, "../../backend");
  const rustDir = path.join(__dirname, "../../rust");
  const pythonPath = path.join(backendDir, "venv", "Scripts", "python.exe");
  // const rustExe = path.join(rustDir, "target/release/rust.exe"); // umcomment this for prod build
  const rustExe = path.join(rustDir, "target/debug/rust.exe");

  // DEBUG: Log the paths
  console.log("Rust directory:", rustDir);
  console.log("Looking for Rust executable at:", rustExe);

  // Check if file exists
  const fs = require("fs");
  if (!fs.existsSync(rustExe)) {
    console.error("ERROR: Rust executable not found at:", rustExe);
    dialog.showErrorBox(
      "Rust Sidecar Missing",
      `rust-llm-sidecar.exe not found at:\n${rustExe}\n\nPlease build it first.`
    );
    app.quit();
    return;
  }

  // 1. Start Rust
  rustProcess = spawn(rustExe, [], {
    cwd: rustDir,
    stdio: "inherit",
    env: { ...process.env, PORT: String(RUST_PORT) },
    stdio: "pipe",
    windowsHide: true,
  });

  // 2. Start Python (Passing RUST_URL as env)
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
      // stdio: "inherit",
      stdio: "pipe", // or "ignore" if you don’t need logs
      windowsHide: true, // <-- hide CMD window
    }
  );

  // Wait for Python Healthcheck
  for (let i = 0; i < 15; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/health`, {
        headers: { "x-token": PYTHON_TOKEN },
      });
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
}

// Handler functions
const fetchWithTimeout = async (url: string, options: any, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const checkHealth = async () => {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/health`, {
        headers: { "x-token": PYTHON_TOKEN },
      });
      if (res.ok) {
        console.log("✅ Python backend ready");
        return true;
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.error("Python backend never came up");

  return false;
};

// IPC Handler
ipcMain.handle("ai:request", async (_event, payload) => {
  const { target = "python", endpoint, method = "POST", body } = payload;
  const port = target === "rust" ? RUST_PORT : PYTHON_PORT;

  try {
    const isPrediction =
      endpoint.includes("predict") || endpoint.includes("run");
    const isAgent = endpoint.includes("/agent/");
    const timeout = isAgent ? 180000 : isPrediction ? 60000 : 5000;

    const res = await fetchWithTimeout(
      `http://127.0.0.1:${port}${endpoint}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-token": PYTHON_TOKEN,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
      timeout
    );

    if (!res.ok) throw new Error(`Backend error: ${res.statusText}`);
    return await res.json();
  } catch (error: any) {
    console.error(`IPC AI Request Failed [${endpoint}]:`, error.message);
    return { error: error.message || "Request failed" };
  }
});

ipcMain.handle("ai:request-stream", async (event, payload) => {
  const { endpoint, method = "POST", body } = payload;

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

    if (!response.ok) throw new Error(`Backend error: ${response.statusText}`);
    if (!response.body) throw new Error("Response body is empty");

    let buffer = "";

    response.body.on("data", (chunk) => {
      buffer += chunk.toString();
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const evt of events) {
        const line = evt.trim();
        if (!line.startsWith("data:")) continue;

        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr);
          event.sender.send("ai:stream-data", parsed);
        } catch (err) {
          console.error("Invalid SSE JSON:", jsonStr);
        }
      }
    });

    response.body.on("end", () => {
      event.sender.send("ai:stream-end");
    });

    response.body.on("error", (err: Error) => {
      event.sender.send("ai:stream-error", { error: err.message });
    });

    return { success: true };
  } catch (error: any) {
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

ipcMain.handle("tray:set-status", (_e, status: TrayStatus) => {
  tray?.setImage(getTrayIcon(status));
});

ipcMain.handle("tray:set-badge", (_e, count: number) => {
  app.setBadgeCount(count);
});
powerMonitor.on("resume", () => {
  mainWindow?.webContents.send("system:resume");
});

// Cleanup
app.on("before-quit", () => {
  isQuitting = true;
  pythonProcess?.kill();
  rustProcess?.kill();
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
  createTray();
  registerHotkeys();
});
