import { FileToCDNUpload } from "@/utils/getFilesUploadQueues";

const _minio = require("minio");
import Minio from "minio";

const BUCKET_NAME = "tf-bitrix-upload";

export const minioClient = new _minio.Client({
  endPoint: "storage.yandexcloud.net",
  useSSL: true,
  accessKey: process.env.YANDEX_CLOUD_ACCESS_KEY,
  secretKey: process.env.YANDEX_CLOUD_SECRET_KEY,
});

type SendFileToCloudParams = FileToCDNUpload & {
  callback?: Minio.ResultCallback<Minio.UploadedObjectInfo>;
};

/**
 *
 * @param localFilePath
 * @param contentType
 * @param resultFolder - use trailing slashes!
 * @param callback
 */
export const sendFileToCloud = ({
  localFilePath,
  resultFolder = ``,
  callback = (err) => console.log(err),
}: SendFileToCloudParams): Promise<void> => {
  return new Promise((resolve) => {
    const fileName = localFilePath.split(`/`).at(-1);

    minioClient.fPutObject(
      BUCKET_NAME,
      `rc-pirate${resultFolder}/${fileName}`,
      localFilePath,
      {},
      (err: Error | null, result: Minio.UploadedObjectInfo) => {
        callback(err, result);
        resolve();
      }
    );
  });
};
