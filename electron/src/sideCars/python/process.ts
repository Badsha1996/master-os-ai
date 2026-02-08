import { ChildProcess, spawn } from "child_process";
import { dirname, PYTHON_PORT, PYTHON_TOKEN, RUST_PORT } from "../../constants";
import path from "path";
import { app, dialog } from "electron";
import { checkPythonHealth } from "./heath";
export class PythonSidecar {
  private process: ChildProcess | null = null;
  private readonly pythonPath: string;
  private readonly backendDir: string;
  constructor(port: number) {
    this.backendDir = path.join(dirname, "../../backend");
    const pythonPath = path.join(
      this.backendDir,
      "venv",
      "Scripts",
      "python.exe",
    );
    this.pythonPath = pythonPath;
  }
  start() {
    console.log("🚀 Starting Python FastAPI server...");
    this.process = spawn(
      this.pythonPath,
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
        cwd: this.backendDir,
        env: {
          ...process.env,
          PYTHON_TOKEN,
          RUST_URL: `http://127.0.0.1:${RUST_PORT}`,
          VIRTUAL_ENV: path.join(this.backendDir, "venv"),
          PATH: `${path.join(this.backendDir, "venv", "Scripts")};${process.env.PATH}`,
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    this.attachLogs();
    this.attachLifecycleHandlers();
  }
  stop() {
    if (this.process && !this.process.killed) {
      this.process.kill();
      this.process = null;
    }
  }
  async waitUntilReady(retries = 30, delayMs = 1000): Promise<void> {
    console.log("⏳ Waiting for Python server...");

    for (let i = 0; i < retries; i++) {
      try {
        const healthy = await checkPythonHealth()
        if (healthy) {
          console.log("✅ Python server ready!");
          return;
        }
      } catch (err) {
        // Server not ready yet
      }

      await new Promise((r) => setTimeout(r, delayMs));
    }

    this.fatalError(
      "Python server failed to start",
      "Python backend did not respond in time",
    );
  }
  private attachLogs() {
    if (!this.process) return;

    const { stdout, stderr } = this.process;
    stdout?.on("data", (data) => {
      console.log(`[Python] ${data.toString().trim()}`);
    });

    stderr?.on("data", (data) => {
      console.error(`[Python Error] ${data.toString().trim()}`);
    });
  }
  private attachLifecycleHandlers() {
    if (!this.process) return;

    this.process.on("error", (err) => {
      console.error("❌ Python process error:", err);
    });

    this.process.on("exit", (code) => {
      console.log(`Python process exited with code ${code}`);
    });
  }
  private fatalError(title: string, message: string): never {
    console.error(`❌ ${title}`);
    dialog.showErrorBox(title, message);
    throw new Error(message);
  }
}
