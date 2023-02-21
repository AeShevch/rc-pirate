import { Nullable } from "./types";
import { Page } from "puppeteer";
import { getCssStringWithUpdatedUrls } from "./getCssStringWithUpdatedUrls";

type GetPageParts = (
  page: Page,
  containerSelector: string
) => Promise<{
  imagesToDownload: string[];
  cssToDownload: string[];
  richContentHtml: Nullable<string>;
}>;

export const getPageParts: GetPageParts = async (page, containerSelector) => {
  await page.exposeFunction(
    "getCssStringWithUpdatedUrls",
    getCssStringWithUpdatedUrls
  );

  return await page.evaluate((containerSelector) => {
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

    richContentElement
      .querySelectorAll(`style`)
      .forEach(async (styleElement) => {
        const cssString = styleElement.innerHTML;

        styleElement.innerHTML = await (
          window as any
        ).getCssStringWithUpdatedUrls(cssString, (src: string) => {
          if (!imagesToDownload.includes(src)) {
            imagesToDownload.push(src);
          }
        });
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
            const [originalSrcFromSrcSet, sizeValue] = srcSetItem.split(` `);

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
};
