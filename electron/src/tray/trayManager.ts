import { app, Menu, nativeImage, Tray } from "electron";
import path from "path";

export type TrayStatus = "idle" | "thinking" | "error";

export class TrayManager {
  private tray: Tray;

  constructor(onSettingsClick?: () => void) {
    const image = this.getIcon("idle");
    image.setTemplateImage(true);

    this.tray = new Tray(image);

    const menu = Menu.buildFromTemplate([
      {
        label: "Settings",
        click: () => onSettingsClick?.(),
      },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]);

    this.tray.setToolTip("Master OS AI");
    this.tray.setContextMenu(menu);
  }

  setStatus(status: TrayStatus) {
    this.tray.setImage(this.getIcon(status));
  }

  destroy() {
    this.tray.destroy();
  }
  setIcon(status: TrayStatus) {
    this.tray.setImage(this.getIcon(status));
  }

  private getIcon(status: TrayStatus) {
    const iconMap = {
      idle: "tray.png",
      thinking: "tray-thinking.png",
      error: "tray-error.png",
    };

    return nativeImage.createFromPath(
      path.join(process.cwd(), "assets", iconMap[status]),
    );
  }
}
