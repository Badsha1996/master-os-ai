import { PYTHON_PORT, PYTHON_TOKEN } from "../../constants";

export async function checkPythonHealth(): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/health`, {
      headers: { "x-token": PYTHON_TOKEN },
    });

    if (res.ok) {
      console.log("✅ Python sidecar healthy");
      return true;
    }
  } catch (error) {
    console.error("❌ Python sidecar health check failed:", error);
  }

  return false;
}
