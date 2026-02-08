import { BrowserWindow, shell } from "electron";
import { CSP_NONCE, dirname } from "../constants";
import path from "path";
export class AppWindow {
  private window: BrowserWindow | null = null;
  private readonly isQuittingRef: () => boolean;
  constructor(isQuittingRef: () => boolean) {
    this.isQuittingRef = isQuittingRef;
    this.createWindow();
  }

  private createWindow() {
    
    this.window = new BrowserWindow({
      width: 800,
      height: 600,
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
    if (!this.window) return;
    this.window.once("ready-to-show", () => this.show());
    this.window.on("close", (e) => {
      if (!this.isQuittingRef()) {
        e.preventDefault();
        this.window?.hide();
      }
    });
    this.window.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });

    this.window.webContents.on("dom-ready", () => {
      this.window?.webContents.executeJavaScript(
        `window.__CSP_NONCE__ = "${CSP_NONCE}";`,
      );
    });
  }
  async loadUI() {
    if (!this.window) return;

    try {
      if (process.env.NODE_ENV === "development") {
        await this.window.loadURL("http://localhost:5173");
      } else if (process.env.VITE_DEV_SERVER_URL) {
        await this.window.loadURL(`${process.env.VITE_DEV_SERVER_URL}`);
      } else {
        await this.window.loadFile(
          path.join(dirname, "../frontend/dist/index.html"),
        );
      }
    } catch (error) {
      console.error("Failed to load SearchWindow UI:", error);

      this.destroy();
      throw error;
    }
  }
  show() {
    if (!this.window) return;
    this.window.show();
  }

  hide() {
    this.window?.hide();
  }
  getWindow() {
    return this.window;
  }
  toggle() {
    if (!this.window) return;

    if (this.window.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }
  destroy() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
    this.window = null;
  }
}
