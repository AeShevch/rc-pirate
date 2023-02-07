// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { ParserFormFields } from "@/pages";
import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";

type Data = {
  url: string | null;
  err: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { url, containerSelector } = req.query as ParserFormFields;
  const publicFileUrl = `/results/${Date.now()}/html/`;
  const newFilePath = `${process.env.PWD}/public${publicFileUrl}`;
  const newFileName = `index.html`;
  const fullPath = newFilePath + newFileName;
  const imagesToDownload = new Set<string>();

  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  if ($(containerSelector).length) {
    try {
      fs.mkdirSync(newFilePath, { recursive: true });
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

    Array.from(imagesToDownload).forEach((src) => {
      const fileName = src.split(`/`).at(-1)?.split('?')[0];
      const resultDir = `${newFilePath}images/`;

      try {
        fs.mkdirSync(resultDir, { recursive: true });
      } catch (e) {
        console.log("Cannot create folder ", e);
      }

      axios({
        method: "GET",
        url: src,
        responseType: "stream",
      }).then((res) => {
        res.data.pipe(fs.createWriteStream(`${resultDir}${fileName}`));
        res.data.on("end", () => {
          console.log("download complete");
        });
      });
    });

    const richContent = $(containerSelector).html();

    if (richContent) {
      fs.writeFile(fullPath, richContent, (err) => {
        if (err) {
          return console.log(err);
        }
        console.log("The file was saved!");
      });
    }

    res.status(200).json({ url: fullPath, err: null });
  } else {
    res.status(404).json({
      url: null,
      err: `Рич контент в контейнере ${containerSelector} не найден на странице ${url} `,
    });
  }
}
