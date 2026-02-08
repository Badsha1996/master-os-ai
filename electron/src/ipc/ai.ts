import { ipcMain } from "electron";
import fetch from "node-fetch";
import { PYTHON_PORT, RUST_PORT, PYTHON_TOKEN } from "../constants";

export function registerAIHandlers() {
  ipcMain.handle("ai:request", async (_event, payload) => {
    const { target = "python", endpoint, method = "POST", body } = payload;
    const port = target === "rust" ? RUST_PORT : PYTHON_PORT;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3 * 60 * 1000);

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
    } catch (err: any) {
      console.error(`IPC Request Failed [${endpoint}]:`, err.message);
      return { error: err.message || "Request failed" };
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
}
