import { app, BrowserWindow, session, shell, ipcMain, dialog } from "electron";
import { spawn, ChildProcess } from "child_process";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import path from "path";
import fetch from "node-fetch";
import fs from "fs";

let mainWindow: BrowserWindow | null = null;
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

  await startSidecars();
  await checkHealth();
}

async function startSidecars() {
  const backendDir = path.join(__dirname, "../../backend");
  const rustDir = path.join(__dirname, "../../rust");
  const pythonPath = path.join(backendDir, "venv", "Scripts", "python.exe");
  const rustExe = path.join(rustDir, "target/debug/rust.exe");

  if (!fs.existsSync(rustExe)) {
    console.error("❌ Rust executable not found!");
    dialog.showErrorBox(
      "Rust Sidecar Missing",
      `rust.exe not found at:\n${rustExe}\n\nBuild it with: cargo build`
    );
    app.quit();
    return;
  }

  const modelPath = path.join(rustDir, "models", "mistral-7b-instruct-v0.2.Q4_K_S.gguf");
  if (!fs.existsSync(modelPath)) {
    console.error("❌ Model file not found!");
    dialog.showErrorBox(
      "Model Missing",
      `Model not found at:\n${modelPath}\n\nPlease download the model first.`
    );
    app.quit();
    return;
  }

  
  rustProcess = spawn(rustExe, [], {
    cwd: rustDir,
    stdio: ["ignore", "pipe", "pipe"], 
    env: { 
      ...process.env, 
      PORT: String(RUST_PORT),
      RUST_LOG: "info", 
    },
    windowsHide: true,
  });

  if (rustProcess.stdout) {
    rustProcess.stdout.on("data", (data) => {
      console.log(`[Rust] ${data.toString().trim()}`);
    });
  }

  if (rustProcess.stderr) {
    rustProcess.stderr.on("data", (data) => {
      console.error(`[Rust Error] ${data.toString().trim()}`);
    });
  }

  rustProcess.on("error", (err) => {
    console.error("❌ Rust process error:", err);
  });

  rustProcess.on("exit", (code) => {
    console.log(`Rust process exited with code ${code}`);
  });

  console.log("⏳ Waiting for Rust server...");
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${RUST_PORT}/health`);
      if (res.ok) {
        console.log("✅ Rust server ready!");
        break;
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

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
    }
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
    "Python backend did not respond in time"
  );
}

const checkHealth = async () => {
  try {
    const res = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/health`, {
      headers: { "x-token": PYTHON_TOKEN },
    });
    if (res.ok) {
      console.log("✅ Health check passed");
      return true;
    }
  } catch (e) {
    console.error("❌ Health check failed:", e);
  }
  return false;
};

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

// Cleanup
app.on("before-quit", () => {
  console.log("🛑 Shutting down processes...");
  pythonProcess?.kill();
  rustProcess?.kill();
});

app.whenReady().then(createWindow);