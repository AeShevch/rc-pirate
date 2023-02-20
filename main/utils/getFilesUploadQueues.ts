import walk from "walk";
import * as path from "path";

const ONE_FILE_QUEUE_LENGTH = 10;

export type FileToCDNUpload = {
  localFilePath: string;
  resultFolder?: string;
};

export const getFilesUploadQueues = (
  localFolderDir: string
): Promise<FileToCDNUpload[][]> => {
  return new Promise((resolve) => {
    const walker = walk.walk(localFolderDir);
    const filesUploadQueues: FileToCDNUpload[][] = [];
    let index = 0;

    walker.on("file", (root, fileStats, next) => {
      const localFilePath = path.join(root, fileStats.name);
      const filesQueueIndex = Math.floor(index / ONE_FILE_QUEUE_LENGTH);

      if (!filesUploadQueues[filesQueueIndex]) {
        filesUploadQueues[filesQueueIndex] = [];
      }

      filesUploadQueues[filesQueueIndex].push({
        localFilePath,
        resultFolder: root.replace(localFolderDir, ``),
      });

      index++;
      next();
    });

    walker.on("errors", (root, nodeStatsArray, next) => {
      next();
    });

    walker.on("end", () => {
      resolve(filesUploadQueues);
    });
  });
};
