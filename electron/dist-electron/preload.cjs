let electron = require("electron");

//#region src/preload.ts
const allowedOnChannels = [
	"ai:response",
	"ai:status",
	"ai:stream-data",
	"ai:stream-end",
	"ai:stream-error"
];
const allowedInvokeChannels = [
	"ai:request",
	"ai:request-stream",
	"ai:cancel",
	"dialog:openFolder"
];
electron.contextBridge.exposeInMainWorld("electronAPI", {
	invoke: (channel, data) => {
		if (!allowedInvokeChannels.includes(channel)) throw new Error("Invalid IPC invoke channel");
		return electron.ipcRenderer.invoke(channel, data);
	},
	on: (channel, callback) => {
		if (!allowedOnChannels.includes(channel)) throw new Error(`Invalid IPC on channel: ${channel}`);
		const listener = (_event, data) => callback(data);
		electron.ipcRenderer.on(channel, listener);
		return () => electron.ipcRenderer.removeListener(channel, listener);
	},
	chat: {
		stream: (text, temperature = .7, maxTokens = 512) => electron.ipcRenderer.invoke("ai:request-stream", {
			endpoint: "/api/chat/stream",
			method: "POST",
			body: {
				text,
				temperature,
				max_tokens: maxTokens
			}
		}),
		getStatus: () => electron.ipcRenderer.invoke("ai:request", {
			endpoint: "/api/chat/status",
			method: "GET"
		})
	},
	files: { openFolder: () => electron.ipcRenderer.invoke("dialog:openFolder") },
	removeAllStreamListeners: () => {
		electron.ipcRenderer.removeAllListeners("ai:stream-data");
		electron.ipcRenderer.removeAllListeners("ai:stream-error");
		electron.ipcRenderer.removeAllListeners("ai:stream-end");
	}
});

//#endregion