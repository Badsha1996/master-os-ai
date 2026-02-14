import { app, session } from "electron";
import { CSP_NONCE, PYTHON_PORT, RUST_PORT } from "../constants";

export async function setupSessionSecurity() {
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
          `connect-src 'self' http://127.0.0.1:${PYTHON_PORT} http://127.0.0.1:${RUST_PORT}`,
        ].join("; "),
      },
    });
  });
}
