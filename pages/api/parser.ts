// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { ParserFormFields } from "@/pages";
import { zipDirectory } from "@/utils/zipDirectory";
import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { downloadImage } from "@/utils/downloadImage";

export type ParserResponsePayload = {
  timestamp: string | null;
  err: string | null;
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
    const imagesToDownload = new Set<string>();
    let html = null;

    try {
      const { data } = await axios.get(url);
      html = data;
    } catch (err) {
      console.log(err);

      res.status(200).json({
        timestamp: null,
        err: `Карамба! Что-то пошло не так - не удаётся загрузить страницу ${url}!`,
      });

      resolve();
      return;
    }

    let $ = cheerio.load(html, {
      decodeEntities: false,
    });

    fs.mkdirSync(`/tmp/results`, { recursive: true });

    fs.rm(`/tmp/results`, { recursive: true }, async (err) => {
      if (err) {
        console.log(`Could not delete the results folder`, err);
      }

      if ($(containerSelector).length) {
        try {
          fs.mkdirSync(resultHTMLDir, { recursive: true });
        } catch (e) {
          console.log("Cannot create folder ", e);
        }

        $(`${containerSelector} img`).each((_, elem) => {
          const originalSrc = $(elem).attr(`src`);
          const originalDataSrc = $(elem).attr(`data-src`);
          const originalSrcSet = $(elem).attr(`srcset`);

          if (originalSrc) {
            const fileName = originalSrc.split(`/`).at(-1);
            imagesToDownload.add(originalSrc);

            $(elem).attr(`src`, `./images/${fileName}`);
          }

          if (originalDataSrc) {
            const fileName = originalDataSrc.split(`/`).at(-1);
            imagesToDownload.add(originalDataSrc);

            $(elem).attr(`data-src`, `./images/${fileName}`);
          }

          if (originalSrcSet) {
            const newSrcSet = originalSrcSet
              .split(`,`)
              .map((srcSetItem) => {
                const [originalSrcFromSrcSet, sizeValue] =
                  srcSetItem.split(` `);

                const fileName = originalSrcFromSrcSet.split(`/`).at(-1);

                imagesToDownload.add(originalSrcFromSrcSet);

                return `./images/${fileName} ${sizeValue}`;
              })
              .join(`,`);

            $(elem).attr(`srcset`, newSrcSet);
          }
        });

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

        $(containerSelector).prepend(`<meta charset="UTF-8">`);
        const richContent = $(containerSelector).html();

        if (richContent) {
          fs.writeFileSync(fullIndexHtmlPath, richContent);

          await zipDirectory(resultHTMLDir, `${resultHTMLDir}.zip`);

          res.status(200).json({
            timestamp,
            err: null,
          });
        }
      } else {
        res.status(200).json({
          timestamp: null,
          err: `Рич контент в контейнере ${containerSelector} не найден на странице ${url} `,
        });
        resolve();
      }
    });
  });
}
