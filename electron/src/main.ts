import { app, BrowserWindow, session, shell, ipcMain } from "electron";
import { spawn, ChildProcess } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fetch from "node-fetch";
import { randomBytes } from "crypto";

let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;

const PYTHON_TOKEN = "54321";
const PYTHON_PORT = 8000;

// CSP nonce (per app launch)
const CSP_NONCE = randomBytes(16).toString("base64");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // prevent white flash
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // No external link allowed - hack risk
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // For dev only environment taiwind css is allowed
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
          `connect-src 'self' http://127.0.0.1:${PYTHON_PORT}`,
        ].join("; "),
      },
    });
  });

  // Frontend
  if (process.env.NODE_ENV === "development") {
    await mainWindow.loadURL("http://localhost:5173");
  } else if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(
      path.join(__dirname, "../frontend/dist/index.html")
    );
  }

  // Content security allow for vue
  mainWindow.webContents.on("dom-ready", () => {
    mainWindow?.webContents.executeJavaScript(`
      window.__CSP_NONCE__ = "${CSP_NONCE}";
    `);
  });

  // backend start
  await startPythonBackend();
}

async function startPythonBackend() {
  const backendPath = path.join(__dirname, "../../backend/main.py");

  pythonProcess = spawn("python", [backendPath], {
    env: {
      ...process.env,
      PYTHON_TOKEN,
      PYTHON_PORT: String(PYTHON_PORT),
    },
    stdio: "inherit",
  });

  pythonProcess.on("exit", () => {
    pythonProcess = null;
  });

  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PYTHON_PORT}/health`, {
        headers: { "x-token": PYTHON_TOKEN },
      });
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }

  throw new Error("Python backend failed to start");
}

// Secure IPC Bridge

ipcMain.handle("ai:request", async (_event, payload) => {
  const { endpoint, method = "GET", body } = payload;

  const res = await fetch(`http://127.0.0.1:${PYTHON_PORT}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-token": PYTHON_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Python error ${res.status}: ${text}`);
  }

  return res.json();
});

// CLEAN UPs
app.on("before-quit", () => {
  if (pythonProcess) pythonProcess.kill();
});

app.whenReady().then(createWindow);
