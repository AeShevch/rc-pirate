import walk from "walk";
import { sendFileToCloud } from "@/utils/sendFileToCloud";

export const uploadFolderToCloud = (
  localFolderDir: string,
  callback: () => void
): Promise<void> => {
    return new Promise((resolve) => {
        const walker = walk.walk(localFolderDir);

        walker.on("file", (root, fileStats, next) => {
            const localFilePath = root + "/" + fileStats.name;

            sendFileToCloud({
                localFilePath,
                resultFolder: root.replace(localFolderDir, ``),
                callback: (err) => {
                    if (err) {
                        console.error(err);
                    }
                    next();
                },
            });
        });

        walker.on("end", function () {
            callback();
            console.log("End upload");
            resolve();
        });
    });
};
