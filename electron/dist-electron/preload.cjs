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
	agent: {
		run: (task) => electron.ipcRenderer.invoke("ai:request", {
			endpoint: "/api/agent/run",
			method: "POST",
			body: { task }
		}),
		loadModel: (gpuLayers = 99) => electron.ipcRenderer.invoke("ai:request", {
			endpoint: "/api/agent/llm/load",
			method: "POST",
			body: { gpu_layers: gpuLayers }
		}),
		unloadModel: () => electron.ipcRenderer.invoke("ai:request", {
			endpoint: "/api/agent/llm/unload",
			method: "POST"
		}),
		checkHealth: () => electron.ipcRenderer.invoke("ai:request", {
			endpoint: "/api/agent/llm/health",
			method: "GET"
		}),
		getMetrics: () => electron.ipcRenderer.invoke("ai:request", {
			endpoint: "/api/agent/llm/metrics",
			method: "GET"
		}),
		getStatus: () => electron.ipcRenderer.invoke("ai:request", {
			endpoint: "/api/agent/llm/status",
			method: "GET"
		}),
		predict: (prompt, maxTokens = 1024, temperature = .1) => electron.ipcRenderer.invoke("ai:request", {
			endpoint: "/api/agent/llm/predict",
			method: "POST",
			body: {
				prompt,
				max_tokens: maxTokens,
				temperature
			}
		}),
		initialize: (gpuLayers = 99, coldStart = true) => electron.ipcRenderer.invoke("ai:request", {
			endpoint: "/api/agent/llm/initialize",
			method: "POST",
			body: {
				gpu_layers: gpuLayers,
				cold_start: coldStart
			}
		})
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
	files: {
		openFolder: () => electron.ipcRenderer.invoke("dialog:openFolder"),
		openItem: (path) => electron.ipcRenderer.invoke("open:path", path)
	},
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