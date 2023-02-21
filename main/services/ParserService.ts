import path from "path";
import puppeteer from "puppeteer";
import fs from "fs";
import { getPageParts } from "../utils/getPageParts";
import { getCssStringWithUpdatedUrls } from "../utils/getCssStringWithUpdatedUrls";
import { downloadFile } from "../utils/downloadFile";
import { zipDirectory } from "../utils/zipDirectory";
import { Nullable } from "../utils/types";

export type ParserResponsePayload = {
  timestamp: Nullable<string>;
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

    await page.exposeFunction(
      "getCssStringWithUpdatedUrls",
      getCssStringWithUpdatedUrls
    );

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
      await page.evaluate((containerSelector) => {
        const richContentElement = document.querySelector(containerSelector);
        const imagesToDownload: string[] = [];
        const cssToDownload: string[] = [];

        if (!richContentElement)
          return {
            richContentHtml: null,
            imagesToDownload: [],
            cssToDownload: [],
          };

        richContentElement.insertAdjacentHTML(
          `afterbegin`,
          `<meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">`
        );

        richContentElement.querySelectorAll(`style`).forEach((styleElement) => {
          const cssString = styleElement.innerHTML;

          styleElement.innerHTML = (window as any).getCssStringWithUpdatedUrls(
            cssString,
            (src: string) => {
              if (!imagesToDownload.includes(src)) {
                imagesToDownload.push(src);
              }
            }
          );
        });

        (
          richContentElement.querySelectorAll(
            `link[rel="stylesheet"]`
          ) as NodeListOf<HTMLLinkElement>
        ).forEach((linkElement) => {
          const fileName = linkElement.href
            .split(`/`)
            .at(-1)
            ?.split(`?`)[0] as string;
          if (!cssToDownload.includes(linkElement.href)) {
            cssToDownload.push(linkElement.href);
          }
          linkElement.href = `./${fileName}`;
        });

        const imgElements: NodeListOf<HTMLImageElement> =
          richContentElement.querySelectorAll(`img`);

        imgElements.forEach((imgElement) => {
          const originalSrc = imgElement.src;
          const originalSrcSet = imgElement.srcset;
          // Apple always use data-src for dynamic images
          const originalDataSrc = imgElement.dataset.src;

          if (originalSrc) {
            const fileName = originalSrc.split(`/`).at(-1);

            if (!imagesToDownload.includes(originalSrc)) {
              imagesToDownload.push(originalSrc);
            }

            imgElement.src = `./images/${fileName}`;
          }

          if (originalDataSrc) {
            const fileName = originalDataSrc.split(`/`).at(-1);

            if (!imagesToDownload.includes(originalDataSrc)) {
              imagesToDownload.push(originalDataSrc);
            }

            imgElement.dataset.src = `./images/${fileName}`;
          }

          if (originalSrcSet) {
            imgElement.srcset = originalSrcSet
              .split(`,`)
              .map((srcSetItem) => {
                const [originalSrcFromSrcSet, sizeValue] =
                  srcSetItem.split(` `);

                const fileName = originalSrcFromSrcSet.split(`/`).at(-1);

                if (!imagesToDownload.includes(originalSrcFromSrcSet)) {
                  imagesToDownload.push(originalSrcFromSrcSet);
                }

                return `./images/${fileName} ${sizeValue}`;
              })
              .join(`,`);
          }
        });

        return {
          richContentHtml: richContentElement.innerHTML,
          imagesToDownload,
          cssToDownload,
        };
      }, containerSelector);

    await browser.close();

    if (!richContentHtml) {
      return {
        timestamp: null,
        err: `Якорь мне в код! Почему-то html пустой, разраба на мостик!`,
      };
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

      return {
        timestamp,
        err: null,
      };
    });
  }
}
