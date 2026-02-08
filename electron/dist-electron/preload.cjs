let electron = require("electron");

//#region src/preload.ts
const allowedOnChannels = [
	"ai:response",
	"ai:status",
	"ai:stream-data",
	"ai:stream-end",
	"ai:stream-error",
	"ui:open-setting"
];
const allowedInvokeChannels = [
	"ai:request",
	"ai:request-stream",
	"ai:cancel",
	"dialog:openFolder",
	"file:search"
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
	files: { openItem: (path) => electron.ipcRenderer.invoke("open:path", path) },
	searchBox: {
		search: (query) => {
			return electron.ipcRenderer.invoke("file:search", {
				endpoint: `/api/file/search`,
				method: "POST",
				query: encodeURIComponent(query)
			});
		},
		resize: (height) => electron.ipcRenderer.invoke("input:resize-window", height)
	},
	removeAllStreamListeners: () => {
		electron.ipcRenderer.removeAllListeners("ai:stream-data");
		electron.ipcRenderer.removeAllListeners("ai:stream-error");
		electron.ipcRenderer.removeAllListeners("ai:stream-end");
		electron.ipcRenderer.removeAllListeners("input:resize-window");
	}
});

//#endregion