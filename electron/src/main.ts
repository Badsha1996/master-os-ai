import { app, BrowserWindow, session, shell, ipcMain, dialog } from "electron";
import { spawn, ChildProcess } from "child_process";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import path from "path";
import fetch from "node-fetch";

let mainWindow: BrowserWindow | null = null;

let viteProcess: ChildProcess | null = null;
let pythonProcess: ChildProcess | null = null;
let rustProcess: ChildProcess | null = null;

const PYTHON_TOKEN = "54321";
const PYTHON_PORT = 8000;
const RUST_PORT = 5005;
const CSP_NONCE = randomBytes(16).toString("base64");

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
      stdio: "inherit",
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

// Cleanup
app.on("before-quit", () => {
  pythonProcess?.kill();
  rustProcess?.kill();
});

app.whenReady().then(createWindow);
