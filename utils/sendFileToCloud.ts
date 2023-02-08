const _minio = require("minio");
import Minio from "minio";

const BUCKET_NAME = "tf-bitrix-upload";

export const minioClient = new _minio.Client({
  endPoint: "storage.yandexcloud.net",
  useSSL: true,
  accessKey: "ymZ1feu4UIhIx2Vk6Q4a",
  secretKey: "BdQ000JbfvwzHGJWyqdmn-dlGDxofWnVIYR8a03g",
});

type SendFileToCloudParams = {
  localFilePath: string;
  resultFolder?: string;
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
