import { app, dialog } from "electron";
import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { dirname } from "../constants";

export class RustProcess {
  private process: ChildProcess | null = null;

  private readonly rustDir: string;
  private readonly rustExe: string;
  private readonly modelPath: string;
  private readonly port: number;

  constructor(port: number) {
    this.port = port;
    this.rustDir = path.join(dirname, "../../rust");
    this.rustExe = path.join(this.rustDir, "target/debug/rust.exe");
    this.modelPath = path.join(
      this.rustDir,
      "models",
      "mistral-7b-instruct-v0.2.Q4_K_S.gguf",
    );
  }

  validate() {
    if (!fs.existsSync(this.rustExe)) {
      this.fatalError(
        "Rust Sidecar Missing",
        `rust.exe not found at:\n${this.rustExe}\n\nBuild it with: cargo build`,
      );
    }

    if (!fs.existsSync(this.modelPath)) {
      this.fatalError(
        "Model Missing",
        `Model not found at:\n${this.modelPath}\n\nPlease download the model first.`,
      );
    }
  }

  start() {
    console.log(" Starting Rust server...");
    this.validate();

    this.process = spawn(this.rustExe, [], {
      cwd: this.rustDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PORT: String(this.port),
        RUST_LOG: "info",
      },
      windowsHide: true,
    });

    this.attachLogs();
    this.attachLifecycleHandlers();
  }

  async waitUntilReady(retries = 30, delayMs = 1000): Promise<void> {
    console.log(" Waiting for Rust server...");

    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/health`);
        if (res.ok) {
          console.log(" Rust server ready!");
          return;
        }
      } catch {
        // Server not ready yet
      }

      await new Promise((r) => setTimeout(r, delayMs));
    }

    throw new Error("Rust sidecar failed to become ready");
  }

  stop() {
    if (this.process && !this.process.killed) {
      this.process.kill();
      this.process = null;
    }
  }

  private attachLogs() {
    if (!this.process) return;

    const { stdout, stderr } = this.process;
    stdout?.on("data", (data) => {
      console.log(`[Rust] ${data.toString().trim()}`);
    });

    stderr?.on("data", (data) => {
      console.error(`[Rust Error] ${data.toString().trim()}`);
    });
  }

  private attachLifecycleHandlers() {
    if (!this.process) return;

    this.process.on("error", (err) => {
      console.error(" Rust process error:", err);
    });

    this.process.on("exit", (code) => {
      console.log(`Rust process exited with code ${code}`);
    });
  }

  private fatalError(title: string, message: string): never {
    console.error(` ${title}`);
    dialog.showErrorBox(title, message);
    app.quit();
    throw new Error(message);
  }
}
