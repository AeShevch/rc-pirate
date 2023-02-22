import path from "path";
import puppeteer from "puppeteer";
import fs from "fs";
import { getPageParts } from "../utils/getPageParts";
import { getCssStringWithUpdatedUrls } from "../utils/getCssStringWithUpdatedUrls";
import { downloadFile } from "../utils/downloadFile";
import { zipDirectory } from "../utils/zipDirectory";
import { Nullable } from "../utils/types";
import walk from "walk";

const ONE_FILE_QUEUE_LENGTH = 10;

export type FileToCDNUpload = {
  localFilePath: string;
  resultFolder?: string;
};

export type ParserResponsePayload = {
  timestamp: Nullable<string>;
  err: Nullable<string>;
};

export type FilesUploadQueuesResponsePayload = {
  filesUploadQueues: FileToCDNUpload[][];
  err: Nullable<string>;
};

export type ParserUserInput = {
  url: string;
  containerSelector: string;
};

export class ParserService {
  public async parse({
    url,
    containerSelector,
  }: ParserUserInput): Promise<ParserResponsePayload | void> {
    const timestamp = Date.now().toString();
    const resultHTMLDir = path.join(`/tmp`, `/results/${timestamp}`, `html`);
    const indexHtmlFileName = `index.html`;
    const fullIndexHtmlPath = path.join(resultHTMLDir, indexHtmlFileName);

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
      const res = await page.goto(url, { timeout: 9999999 });
    } catch (err) {
      console.log(err);

      await browser.close();

      return {
        timestamp: null,
        err: `Карамба! Страница не найдена или слишком долго открывается. Убедитесь в корректности вводных или попробуйте попробовать ещё раз.`,
      };
    }

    try {
      await page.waitForSelector(containerSelector);
    } catch (err) {
      console.log(err);
      await browser.close();

      return {
        timestamp: null,
        err: `Возвращаемся! Рич контент в контейнере ${containerSelector} не найден на странице ${url} `,
      };
    }

    const { richContentHtml, imagesToDownload, cssToDownload } =
      await getPageParts(page, containerSelector);

    await browser.close();

    if (!richContentHtml) {
      return {
        timestamp: null,
        err: `Якорь мне в код! Почему-то html пустой, разраба на мостик!`,
      };
    }

    fs.mkdirSync(`/tmp/results`, { recursive: true });

    fs.rmSync(`/tmp/results`, { recursive: true });

    try {
      fs.mkdirSync(resultHTMLDir, { recursive: true });
    } catch (e) {
      console.log("Cannot create folder ", e);
    }

    const resultImagesDir = path.join(resultHTMLDir, `images/`);
    try {
      fs.mkdirSync(resultImagesDir, { recursive: true });
    } catch (e) {
      console.log("Cannot create folder", e);
    }

    for await (const cssHref of cssToDownload) {
      try {
        const fileName = cssHref.split(`/`).at(-1)?.split("?")[0] as string;
        const response = await fetch(cssHref);

        const cssString = await response.text();

        if (!cssString) continue;

        const updatedCssString = getCssStringWithUpdatedUrls(
          cssString,
          (src) => {
            imagesToDownload.push(src);
          }
        );

        fs.writeFileSync(path.join(resultHTMLDir, fileName), updatedCssString);
      } catch (err) {
        console.log(err);
      }
    }

    for await (const src of imagesToDownload) {
      const imageName = src.split(`/`).at(-1)?.split("?")[0] as string;

      await downloadFile(src, path.join(resultImagesDir, imageName));
    }

    fs.writeFileSync(fullIndexHtmlPath, richContentHtml);

    await zipDirectory(resultHTMLDir, `${resultHTMLDir}.zip`);

    return {
      timestamp,
      err: null,
    };
  }

  public async prepareCdnUploadQueues(
    localFolderDir: string
  ): Promise<FileToCDNUpload[][]> {
    return new Promise((resolve) => {
      const walker = walk.walk(localFolderDir);
      const filesUploadQueues: FileToCDNUpload[][] = [];
      let index = 0;

      walker.on("file", (root, fileStats, next) => {
        const localFilePath = path.join(root, fileStats.name);
        const filesQueueIndex = Math.floor(index / ONE_FILE_QUEUE_LENGTH);

        if (!filesUploadQueues[filesQueueIndex]) {
          filesUploadQueues[filesQueueIndex] = [];
        }

        filesUploadQueues[filesQueueIndex].push({
          localFilePath,
          resultFolder: root.replace(localFolderDir, ``),
        });

        index++;
        next();
      });

      walker.on("errors", (root, nodeStatsArray, next) => {
        next();
      });

      walker.on("end", () => {
        resolve(filesUploadQueues);
      });
    });
  }
}
