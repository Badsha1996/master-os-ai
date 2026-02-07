import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import path from "path";

export const filename = fileURLToPath(import.meta.url);
export const dirname = path.dirname(filename);
export const PYTHON_TOKEN = "54321";
export const PYTHON_PORT = 8000;
export const RUST_PORT = 5005;
export const CSP_NONCE = randomBytes(16).toString("base64");