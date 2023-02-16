export type GetCssStringWithUpdatedUrls = (
  originalCss: string,
  middleware?: (originalUrl: string) => void
) => string;

export const getCssStringWithUpdatedUrls: GetCssStringWithUpdatedUrls = (
  originalCss,
  middleware = () => {}
) =>
  originalCss.replaceAll(
    /(url\W*\(\W*['"]?\W*)(.*?)(\W*['"]?\W*\))/g,
    (match, _, src) => {
      const fileName = src.split(`/`).at(-1);
      middleware(src);

      return `url("./images/${fileName}")`;
    }
  );
