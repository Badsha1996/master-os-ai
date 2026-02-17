import { app, globalShortcut, powerMonitor } from "electron";
import { TrayManager } from "./tray/trayManager";
import { PYTHON_PORT, RUST_PORT } from "./constants";
import { setupSessionSecurity } from "./security/session";
import { SearchWindow } from "./windows/searchWindow";
import { AppWindow } from "./windows/appWindow";
import { registerFileHandlers } from "./ipc/files";
import { registerSearchBoxHandlers } from "./ipc/input";
import { registerAIHandlers } from "./ipc/ai";
import { registerTrayHandlers } from "./ipc/tray";
import { PythonProcess } from "./process/pythonProcess.ts";
import { RustProcess } from "./process/rustProcess.ts";
import { registerLogHandlers } from "./ipc/log.ts";

let mainWindow: AppWindow | null = null;
let inputWindow: SearchWindow | null = null;
let trayManager: TrayManager | null = null;

let pythonProcess: PythonProcess | null = null;
let rustProcess: RustProcess | null = null;

let isQuitting = false;

async function createInputWindow() {
  if (inputWindow && !inputWindow.isDestroyed()) return;


  try {
    inputWindow = new SearchWindow(() => (inputWindow = null));

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
  if (!inputWindow || inputWindow?.isDestroyed()) {
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
  mainWindow = new AppWindow(() => isQuitting);
  await mainWindow.loadUI();
  await startSidecars();
  await PythonProcess.checkHealth();
}

async function startSidecars() {
  rustProcess = new RustProcess(RUST_PORT);
  rustProcess.start();
  await rustProcess.waitUntilReady();

  pythonProcess = new PythonProcess(PYTHON_PORT);
  pythonProcess.start();
  await pythonProcess.waitUntilReady();
}

// IPC Handlers
registerLogHandlers();
registerAIHandlers();
registerFileHandlers();
registerSearchBoxHandlers({ getInputWindow: () => inputWindow });
registerTrayHandlers({ getTrayManager: () => trayManager });
powerMonitor.on("resume", () => {
  const win = mainWindow?.getWindow();

  if (win && !win.isDestroyed()) {
    win.webContents.send("system:resume");
  }
});

// Cleanup
app.on("before-quit", () => {
  isQuitting = true;
  console.log(" Shutting down processes...");
  pythonProcess?.stop();
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
