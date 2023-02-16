import { Nullable } from "@/renderer/utils/types";
import { Page } from "puppeteer";
import { getCssStringWithUpdatedUrls } from "@/renderer/utils/getCssStringWithUpdatedUrls";

type GetPageParts = (
  page: Page,
  containerSelector: string
) => Promise<{
  imagesToDownload: string[];
  cssToDownload: string[];
  richContentHtml: Nullable<string>;
}>;

// @ts-ignore WTF?!
export const getPageParts: GetPageParts = async (page, containerSelector) => {
  await page.exposeFunction(
    "getCssStringWithUpdatedUrls",
    getCssStringWithUpdatedUrls
  );

  return await page.evaluate(async (containerSelector) => {
    const richContentElement = document.querySelector(containerSelector);
    const imagesToDownload = new Set<string>();
    const cssToDownload = new Set<string>();

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

    richContentElement
      .querySelectorAll(`style`)
      .forEach(async (styleElement) => {
        const cssString = styleElement.innerHTML;

        styleElement.innerHTML = await getCssStringWithUpdatedUrls(
          cssString,
          (src) => imagesToDownload.add(src)
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
        ?.split("?")[0] as string;
      cssToDownload.add(linkElement.href);
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
        imagesToDownload.add(imgElement.src);

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
      imagesToDownload: Array.from(imagesToDownload),
      cssToDownload: Array.from(cssToDownload),
    };
  }, containerSelector);
};
