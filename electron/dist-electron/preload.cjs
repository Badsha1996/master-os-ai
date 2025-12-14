let electron = require("electron");

//#region src/preload.ts
const allowedInvokeChannels = [
	"ai:request",
	"ai:cancel",
	"dialog:openFolder"
];
electron.contextBridge.exposeInMainWorld("electronAPI", {
	invoke: (channel, data) => {
		if (!allowedInvokeChannels.includes(channel)) throw new Error("Invalid IPC invoke channel");
		return electron.ipcRenderer.invoke(channel, data);
	},
	on: (channel, callback) => {
		if (!["ai:response", "ai:status"].includes(channel)) throw new Error("Invalid IPC on channel");
		const listener = (_, data) => callback(data);
		electron.ipcRenderer.on(channel, listener);
		return () => electron.ipcRenderer.removeListener(channel, listener);
	}
});

//#endregion