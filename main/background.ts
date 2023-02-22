import { app, ipcMain } from "electron";
import type Electron from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { IPCChannel } from "./const";
import {
  FileToCDNUpload,
  ParserService,
  ParserUserInput,
} from "./services/ParserService";
import { CDNService } from "./services/CDNService";

const isProd = process.env.NODE_ENV === "production";
const parserService = new ParserService();
const cdnService = new CDNService();

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

(async () => {
  await app.whenReady();

  const mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
  });

  ipcMain.on(
    IPCChannel.Parse,
    async (event: Electron.IpcMainEvent, userInput: ParserUserInput) => {
      try {
        const res = await parserService.parse(userInput);

        return event.sender.send(IPCChannel.Parse, res);
      } catch (err) {
        return event.sender.send(IPCChannel.Parse, {
          timestamp: null,
          err,
        });
      }
    }
  );

  ipcMain.on(
    IPCChannel.GetUploadQueues,
    async (event: Electron.IpcMainEvent) => {
      try {
        const filesUploadQueues = await parserService.prepareCdnUploadQueues(
          `/tmp/results`
        );

        return event.sender.send(IPCChannel.GetUploadQueues, {
          filesUploadQueues,
          err: null,
        });
      } catch (err) {
        return event.sender.send(IPCChannel.GetUploadQueues, {
          filesUploadQueues: null,
          err,
        });
      }
    }
  );

  ipcMain.on(
    IPCChannel.UploadToCDN,
    async (event: Electron.IpcMainEvent, files: FileToCDNUpload[]) => {
      try {
        await cdnService.upload(files);

        return event.sender.send(IPCChannel.UploadToCDN);
      } catch (err) {
        return event.sender.send(IPCChannel.UploadToCDN, { err });
      }
    }
  );

  if (isProd) {
    await mainWindow.loadURL("app://./");
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/`);
    mainWindow.webContents.openDevTools();
  }
})();

app.on("window-all-closed", () => {
  app.quit();
});
