import walk from "walk";
import { sendFileToCloud } from "@/utils/sendFileToCloud";
import * as path from "path";

const PROMISES_QUERY_SIZE = 10;

export const uploadFolderToCloud = (
  localFolderDir: string,
  callback: () => void
): Promise<void> => {
  return new Promise((resolve) => {
    const walker = walk.walk(localFolderDir);
    const promisesQues: Promise<any>[][] = [];
    let index = 0;

    walker.on("file", (root, fileStats, next) => {
      const localFilePath = path.join(root, fileStats.name);
      const promisesIndex = Math.floor(index / PROMISES_QUERY_SIZE);

      console.log(promisesIndex);

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

    walker.on("end", function () {
      console.log(promisesQues);
      promisesQues.forEach(async (promises, i) => {
        await Promise.allSettled(promisesQues);

        if (i === promisesQues.length - 1) {
          callback();
          console.log("End upload");
          resolve();
        }
      });
    });
  });
};
