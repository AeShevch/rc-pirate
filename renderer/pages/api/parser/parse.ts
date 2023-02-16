import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

import { ParserFormFields } from "@/renderer/pages";
import { zipDirectory } from "@/renderer/utils/zipDirectory";
import { downloadFile } from "@/renderer/utils/downloadFile";
import { Nullable } from "@/renderer/utils/types";
import { getPageParts } from "@/renderer/utils/getPageParts";
import { getCssStringWithUpdatedUrls } from "@/renderer/utils/getCssStringWithUpdatedUrls";

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
      await page.goto(url, { timeout: 99999 });
    } catch (err) {
      console.log(err);

      await res.status(200).json({
        timestamp: null,
        err: `Карамба! Страница не найдена или слишком долго открывается. Убедитесь в корректности вводных или попробуйте попробовать ещё раз.`,
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

    const { richContentHtml, imagesToDownload, cssToDownload } =
      await getPageParts(page, containerSelector);

    await browser.close();

    if (!richContentHtml) {
      await res.status(200).json({
        timestamp: null,
        err: `Якорь мне в код! Почему-то html пустой, разраба на мостик!`,
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

          fs.writeFileSync(
            path.join(resultHTMLDir, fileName),
            updatedCssString
          );
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

      await res.status(200).json({
        timestamp,
        err: null,
      });
      resolve();
    });
  });
}
