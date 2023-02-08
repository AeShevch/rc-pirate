import walk from "walk";
import { sendFileToCloud } from "@/utils/sendFileToCloud";
import * as path from "path";

export const uploadFolderToCloud = (
  localFolderDir: string,
  callback: () => void
): Promise<void> => {
  return new Promise((resolve) => {
    const walker = walk.walk(localFolderDir);
    const promises: Promise<any>[] = [];

    walker.on("file", (root, fileStats, next) => {
      const localFilePath = path.join(root, fileStats.name);

      promises.push(
        sendFileToCloud({
          localFilePath,
          resultFolder: root.replace(localFolderDir, ``),
          callback: (err) => {
            if (err) console.error(err);
          },
        })
      );

      next();
    });

    Promise.allSettled(promises).finally(() => {
      callback();
      console.log("End upload");
      resolve();
    });
  });
};
