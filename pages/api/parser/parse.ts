import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

import { ParserFormFields } from "@/pages";
import { zipDirectory } from "@/utils/zipDirectory";
import { downloadImage } from "@/utils/downloadImage";
import { Nullable } from "@/utils/types";
import { getHtmlAndImagesFromPage } from "@/utils/getHtmlAndImagesFromPage";

export type ParserResponsePayload = {
  timestamp: Nullable<string>;
  err: Nullable<string>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParserResponsePayload>
): Promise<void> {
  return new Promise(async (resolve) => {
    const { url, containerSelector } = req.query as ParserFormFields;
    const timestamp = Date.now().toString();
    const resultHTMLDir = path.join(`/tmp`, `/results/${timestamp}`, `html`);
    const indexHtmlFileName = `index.html`;
    const fullIndexHtmlPath = path.join(resultHTMLDir, indexHtmlFileName);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
      await page.goto(url, {timeout: 99999});
    } catch (err) {
      console.log(err);

      await res.status(200).json({
        timestamp: null,
        err: `Карамба! Страница не найдена или слишком долго открывается.`,
      });

      resolve();
      return;
    }

    try {
      await page.waitForSelector(containerSelector);
    } catch (err) {
      console.log(err);

      await res.status(200).json({
        timestamp: null,
        err: `Возвращаемся! Рич контент в контейнере ${containerSelector} не найден на странице ${url} `,
      });
      resolve();
      return;
    }

    const { richContentHtml, imagesToDownload } = await getHtmlAndImagesFromPage(page, containerSelector);

    await browser.close();

    if (!richContentHtml) {
      await res.status(200).json({
        timestamp: null,
        err: `Якорь мне в код! Произошла ошибка при подготовке html, разраба на мостик!`,
      });
      resolve();
      return;
    }

    fs.mkdirSync(`/tmp/results`, { recursive: true });

    fs.rm(`/tmp/results`, { recursive: true }, async (err) => {
      if (err) {
        console.log(`Could not delete the results folder`, err);
      }

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

      for (const src of Array.from(imagesToDownload)) {
        const imageName = src.split(`/`).at(-1)?.split("?")[0] as string;

        await downloadImage(src, path.join(resultImagesDir, imageName));
      }

      fs.writeFileSync(fullIndexHtmlPath, richContentHtml);

      await zipDirectory(resultHTMLDir, `${resultHTMLDir}.zip`);

      await res.status(200).json({
        timestamp,
        err: null,
      });
      resolve();
    });
  });
}
