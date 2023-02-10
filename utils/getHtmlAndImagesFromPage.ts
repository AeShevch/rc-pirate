import { Nullable } from "@/utils/types";
import { Page } from "puppeteer";

type GetRichContentHtmlString = (
  page: Page,
  containerSelector: string
) => Promise<{
  imagesToDownload: Set<string>;
  richContentHtml: Nullable<string>;
}>;

export const getHtmlAndImagesFromPage: GetRichContentHtmlString = async (
  page,
  containerSelector
) => {
  return await page.evaluate((containerSelector) => {
    const richContentElement = document.querySelector(containerSelector);
    const imagesToDownload = new Set<string>();

    if (!richContentElement)
      return {
        richContentHtml: null,
        imagesToDownload,
      };

    richContentElement.insertAdjacentHTML(
      `afterbegin`,
      `<meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">`
    );

    const imgElements: NodeListOf<HTMLImageElement> =
      richContentElement.querySelectorAll(`${containerSelector} img`);

    imgElements.forEach((imgElement) => {
      const originalSrc = imgElement.src;
      const originalSrcSet = imgElement.srcset;
      // Apple always use data-src for dynamic images
      const originalDataSrc = imgElement.dataset.src;

      if (originalSrc) {
        const fileName = originalSrc.split(`/`).at(-1);
        imagesToDownload.add(originalSrc);

        imgElement.src = `./images/${fileName}`;
      }

      if (originalDataSrc) {
        const fileName = originalDataSrc.split(`/`).at(-1);
        imagesToDownload.add(originalDataSrc);

        imgElement.dataset.src = `./images/${fileName}`;
      }

      if (originalSrcSet) {
        imgElement.srcset = originalSrcSet
          .split(`,`)
          .map((srcSetItem) => {
            const [originalSrcFromSrcSet, sizeValue] = srcSetItem.split(` `);

            const fileName = originalSrcFromSrcSet.split(`/`).at(-1);

            imagesToDownload.add(originalSrcFromSrcSet);

            return `./images/${fileName} ${sizeValue}`;
          })
          .join(`,`);
      }
    });

    return {
      richContentHtml: richContentElement.innerHTML,
      imagesToDownload,
    };
  }, containerSelector);
};
