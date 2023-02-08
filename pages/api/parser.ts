// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { ParserFormFields } from "@/pages";
import { zipDirectory } from "@/utils/zipDirectory";
import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";
import { downloadImage } from "@/utils/downloadImage";

export type ParserResponsePayload = {
  previewUrl: string | null;
  downloadUrl: string | null;
  err: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParserResponsePayload>
) {
  const { url, containerSelector } = req.query as ParserFormFields;
  const publicResultUrl = `/results/${Date.now()}`;
  const resultDir = `${process.env.PWD}/public${publicResultUrl}/html`;
  const indexHtmlFileName = `index.html`;
  const fullIndexHtmlPath = `${resultDir}/${indexHtmlFileName}`;
  const imagesToDownload = new Set<string>();

  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  fs.rm(`${process.env.PWD}/public/results`, { recursive: true }, (err) =>
    console.log(err)
  );

  if ($(containerSelector).length) {
    try {
      fs.mkdirSync(resultDir, { recursive: true });
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
            const [originalSrcFromSrcSet, sizeValue] = srcSetItem.split(` `);

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
      const resultImagesDir = `${resultDir}/images/`;

      try {
        fs.mkdirSync(resultImagesDir, { recursive: true });
      } catch (e) {
        console.log("Cannot create folder ", e);
      }

      await downloadImage(src, `${resultImagesDir}${imageName}`);
    }

    const richContent = $(containerSelector).html();

    if (richContent) {
      fs.writeFile(fullIndexHtmlPath, richContent, (err) => {
        if (err) {
          return console.log(err);
        }
        console.log("The index.html file was saved!");
        zipDirectory(resultDir, `${resultDir}.zip`);
      });
    }

    res.status(200).json({
      previewUrl: `${publicResultUrl}/html/index.html`,
      downloadUrl: `${publicResultUrl}/html.zip`,
      err: null,
    });
  } else {
    res.status(404).json({
      previewUrl: null,
      downloadUrl: null,
      err: `Рич контент в контейнере ${containerSelector} не найден на странице ${url} `,
    });
  }
}
