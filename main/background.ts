import { app, ipcMain } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { IPCChannel } from "./const";
import { ParserService } from "./services/ParserService";

const isProd = process.env.NODE_ENV === "production";
const parserService = new ParserService();

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

  ipcMain.on(IPCChannel.Parse, async (event, userInput) => {
    console.log(userInput);
    const res = await parserService.parse(userInput);
    console.log(`END  `, res);
    return event.sender.send(IPCChannel.Parse, res);
  });

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
