# Master OS AI

Master OS AI is a desktop application combining an Electron shell, a Vue 3 frontend, and a FastAPI Python backend. It provides a file-system watcher interface and LLM-related processing for local or integrated AI features. This README documents project structure, installation, development, configuration, security notes, and licensing.

---

## Project summary

- Electron app hosts a Vue frontend in a secure, sandboxed window and can spawn/communicate with a local Python backend.
- FastAPI backend provides file-system watchers, LLM response endpoints, and local model integration.
- Frontend is built with Vue 3 + Vite and uses Pinia for state.
- Intended for local development and experimentation. Distribution or use requires an explicit license from the copyright holder.

---

## Repo layout (high-level)

- /electron — Electron source (TypeScript) and build outputs.
  - src/main.ts — Electron main process (window creation, optional Python spawn).
  - src/preload.ts — Preload bridge/IPC allow-list.
  - dist-electron/ — Build artifacts (main.mjs, preload.cjs, helpers).
- /frontend — Vue 3 + Vite application.
  - src/ — App.vue, components (chat interface), router, stores.
  - index.html, vite.config.ts, package.json
- /backend — FastAPI server and local models.
  - main.py — FastAPI app, health/auth token handling.
  - routes/ — file_system.py (watcher), llm_response.py (LLM endpoints).
  - models/ — local model files (gguf or similar).
  - requirements.txt

---

## Key files

- electron/src/main.ts — window lifecycle, CSP nonce, optional startPythonBackend
- electron/src/preload.ts — secure IPC exposure
- frontend/src/main.ts — Vue app bootstrap
- frontend/src/components/chatInterface/index.vue — chat UI & event handling
- backend/main.py — FastAPI app with token check & health endpoints
- backend/routes/file_system.py — folder watching and file event models
- backend/requirements.txt — Python dependencies

---

## Technology stack

- Electron (Node.js) for the desktop shell.
- Vue 3 + Vite + Pinia for the frontend UI.
- Python 3.10+ with FastAPI + Uvicorn for backend APIs.
- Local LLM model files (gguf) optional; model loader not packaged here.
- Recommended package manager: pnpm (frontend/electron includes lockfiles).

---

## Prerequisites

- Node.js >= 20
- pnpm (or npm/yarn with adjustments)
- Python 3.10+
- Git (optional)
- Recommended OS: Windows/macOS/Linux (project configured with Windows paths in examples)

---

## Installation (development)

1. Backend
   - Open terminal (PowerShell/CMD) and run:
     ```sh
     cd backend
     python -m venv venv
     # Windows:
     venv\Scripts\activate
     pip install -r requirements.txt
     ```
   - Verify `uvicorn` installed and backend runs:
     ```sh
     uvicorn main:app --host 127.0.0.1 --port 8000
     ```

2. Frontend
   - In a new terminal:
     ```sh
     cd frontend
     pnpm install
     pnpm dev
     ```
   - For production build:
     ```sh
     pnpm build
     ```

3. Electron
   - In another terminal:
     ```sh
     cd electron
     pnpm install
     pnpm run build   # if configured; builds dist-electron outputs
     pnpm start       # starts Electron (may spawn backend if configured)
     ```
   - Electron main can optionally spawn the backend venv (see electron/src/main.ts).

---

## Running the full app (recommended dev flow)

Option A — Manual:
- Start backend (uvicorn).
- Start frontend (pnpm dev).
- Start electron (pnpm start).

Option B — Electron spawns backend:
- Ensure backend venv is created and dependencies installed.
- Start Electron; it will attempt to spawn the configured Python executable and pass a token.

---

## Configuration

- Backend auth token:
  - Default token is stored in backend/main.py and matched by Electron when spawning backend.
  - Replace with a secure token and/or load from environment variables.
- Environment files:
  - Add .env or .env.local and ensure secrets are not committed.
- CSP nonce:
  - Electron generates a nonce inserted into the frontend to harden Content Security Policy. Review code for injection location.

---

## Security notes

- Preload/IPC:
  - The preload exposes an allow-list of IPC channels (electron/src/preload.ts). Keep the list minimal and audit any additions.
- Local model files:
  - Keep large model files outside source control. The repository contains references to model files; do not distribute model weights without the model license.
- Tokens and secrets:
  - Do not commit secrets. Use environment variables or a secure secret store before distribution.

---

## Development tips

- Use VS Code tasks / pnpm scripts to coordinate frontend/backend/electron runs.
- Keep electron/dist-electron out of source control if rebuilding locally.
- For changes to preload or IPC, add tests or manual integration checks before trusting in production.

---

## Testing

- Backend: add pytest + pytest-asyncio for API and watcher unit tests.
- Frontend: use Vitest / testing-library for component/unit tests.
- Electron: use spectron or Playwright for integration tests where needed.

---

## Limitations & responsibilities

- This project may include references to third-party models or code. Ensure you have the right to use any models and comply with their licenses.
- Distribution or public release of this repository or its artifacts is strictly restricted by the project's license (see LICENSE.md). Do not distribute copies, builds, or modified versions without an explicit written license from the copyright holder.

---

## License & distribution

This project is provided under a restrictive "All rights reserved" style license. See LICENSE.md for the full legal text. You must obtain an explicit written license from the copyright holder before using, copying, modifying, distributing, or packaging this project.

---

## Adding a license / example files

Recommended additions to the repo:
- LICENSE.md — restrictive license text (provided).
- .env.example — sample env keys (PYTHON_TOKEN, BACKEND_URL).
- CONTRIBUTING.md — contribution and code-of-conduct guidance.

---

## Contact / licensing requests

To request a license or commercial use permission, provide:
- Intended use and scope
- Distribution targets (platforms, users)
- Any planned modifications
- Contact name/email

Replace the placeholder below with the real contact details when ready:
- Contact: <copyright-holder-email@example.com>

---

## Acknowledgements

- Electron, Vue, Vite, FastAPI authors and communities.
- Any model owners; verify and comply with respective model licenses.
