import walk from "walk";
import { sendFileToCloud } from "@/utils/sendFileToCloud";
import * as path from "path";

const PROMISES_QUERY_SIZE = 5;

export const uploadFolderToCloud = (localFolderDir: string): Promise<void> => {
  return new Promise((resolve) => {
    const walker = walk.walk(localFolderDir);
    const promisesQues: Promise<any>[][] = [];
    let index = 0;

    walker.on("file", (root, fileStats, next) => {
      const localFilePath = path.join(root, fileStats.name);
      const promisesIndex = Math.floor(index / PROMISES_QUERY_SIZE);

      if (!promisesQues[promisesIndex]) {
        promisesQues[promisesIndex] = [];
      }

      promisesQues[promisesIndex].push(
        sendFileToCloud({
          localFilePath,
          resultFolder: root.replace(localFolderDir, ``),
          callback: (err) => {
            if (err) console.error(err);
          },
        })
      );

      index++;
      next();
    });

    let resolvedQues = 0;

    walker.on("end", function () {
      promisesQues.forEach(
        async (promises, i) =>
          await Promise.all(promises).finally(() => {
            resolvedQues++;
            if (resolvedQues === promisesQues.length) {
              console.log("End upload");
              resolve();
            }
          })
      );
    });
  });
};
