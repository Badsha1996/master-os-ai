import { BrowserWindow, screen } from "electron";
import path from "path";
import { dirname } from "../constants";

export class SearchWindow {
  private window: BrowserWindow | null = null;

  constructor(private onDestroy?: () => void) {
    this.createWindow();
  }

  private createWindow() {
    const { width } = screen.getPrimaryDisplay().workAreaSize;

    this.window = new BrowserWindow({
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
        preload: path.join(dirname, "preload.cjs"),
        contextIsolation: true,
        sandbox: true,
      },
    });

    this.attachEvents();
  }

  private attachEvents() {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.on("blur", () => {
      if (!this.window || this.window.isDestroyed()) return;
      this.window.setMinimumSize(600, 60);
      this.setSize(600, 60);
      this.window.webContents.send("window:blur");
    });

    this.window.on("focus", () => {
      if (!this.window || this.window.isDestroyed()) return;
      this.window.webContents.send("window:focus");
    });
    this.window.on("close", (e) => {
      e.preventDefault();
      this.window?.hide();
    });
  }

  async loadUI() {
    if (!this.window || this.window.isDestroyed()) return;

    try {
      if (process.env.NODE_ENV === "development") {
        await this.window.loadURL("http://localhost:5173/command");
      } else if (process.env.VITE_DEV_SERVER_URL) {
        await this.window.loadURL(`${process.env.VITE_DEV_SERVER_URL}/command`);
      } else {
        await this.window.loadFile(
          path.join(dirname, "../frontend/dist/index.html"),
          { search: "?route=command" },
        );
      }
    } catch (error) {
      console.error("Failed to load SearchWindow UI:", error);

      this.destroy();
      throw error;
    }
  }

  show() {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.show();
    this.window.focus();
  }

  hide() {
    if (!this.window || this.window.isDestroyed()) return;
    this.window?.hide();
  }

  toggle() {
    if (!this.window || this.window.isDestroyed()) return;

    if (this.window.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }
  setSize(width: number, height: number) {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.setMinimumSize(width, height);
    this.window?.setSize(width, height, true);
  }

  destroy() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
    this.window = null;
    this.onDestroy?.();
  }
  isDestroyed() {
    return this.window?.isDestroyed() ?? true;
  }
}
