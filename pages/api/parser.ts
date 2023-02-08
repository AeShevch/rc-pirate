// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { ParserFormFields } from "@/pages";
import { zipDirectory } from "@/utils/zipDirectory";
import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";
import { downloadImage } from "@/utils/downloadImage";
import { uploadFolderToCloud } from "@/utils/uploadFolderToCloud";

export type ParserResponsePayload = {
  previewUrl: string | null;
  downloadUrl: string | null;
  err: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParserResponsePayload>
): Promise<void> {
  return new Promise(async (resove) => {
    const { url, containerSelector } = req.query as ParserFormFields;
    const timestamp = Date.now();
    const publicResultUrl = `/results/${timestamp}`;
    const resultHTMLDir = `${process.env.PWD}/upload${publicResultUrl}/html`;
    const indexHtmlFileName = `index.html`;
    const fullIndexHtmlPath = `${resultHTMLDir}/${indexHtmlFileName}`;
    const imagesToDownload = new Set<string>();
    let html = null;

    try {
      const { data } = await axios.get(url);
      html = data;
    } catch (err) {
      console.log(err);

      res.status(500).json({
        previewUrl: null,
        downloadUrl: null,
        err: `Карамба! Что-то пошло не так - не удаётся загрузить страницу ${url}!`,
      });

      resove();
      return;
    }

    let $ = cheerio.load(html, {
      decodeEntities: false,
    });

    fs.rm(
      `${process.env.PWD}/upload/results`,
      { recursive: true },
      async (err) => {
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

          for (const src of Array.from(imagesToDownload)) {
            const imageName = src.split(`/`).at(-1)?.split("?")[0];
            const resultImagesDir = `${resultHTMLDir}/images/`;

            try {
              fs.mkdirSync(resultImagesDir, { recursive: true });
              await downloadImage(src, `${resultImagesDir}${imageName}`);
            } catch (e) {
              console.log("Cannot create folder ", e);
            }
          }

          $(containerSelector).prepend(`<meta charset="UTF-8">`);
          const richContent = $(containerSelector).html();

          if (richContent) {
            fs.writeFileSync(fullIndexHtmlPath, richContent);
            console.log(`fs.writeFile ok`);

            await zipDirectory(resultHTMLDir, `${resultHTMLDir}.zip`);

            await uploadFolderToCloud(
              `${process.env.PWD}/upload/results`,
              () => {
                res.status(200).json({
                  previewUrl: `https://cdn.iport.ru/rc-pirate/${timestamp}/html/index.html`,
                  downloadUrl: `https://cdn.iport.ru/rc-pirate/${timestamp}/html.zip`,
                  err: null,
                });
                resove();
              }
            );
          }
        } else {
          res.status(404).json({
            previewUrl: null,
            downloadUrl: null,
            err: `Рич контент в контейнере ${containerSelector} не найден на странице ${url} `,
          });
          resove();
        }
      }
    );
  });
}
