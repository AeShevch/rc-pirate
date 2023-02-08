import type { NextApiRequest, NextApiResponse } from "next";
import { uploadFolderToCloud } from "@/utils/uploadFolderToCloud";
import path from "path";

export type CloudResponsePayload = {
  previewUrl: string | null;
  downloadUrl: string | null;
  err: string | null;
};

export type CloudRequestPayload = {
  timestamp: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CloudResponsePayload>
): Promise<void> {
  const { timestamp } = req.query as CloudRequestPayload;
  return new Promise(async (resolve) => {
    await uploadFolderToCloud(path.join(`/tmp`, `results`), () => {
      res.status(200).json({
        previewUrl: `https://cdn.iport.ru/rc-pirate/${timestamp}/html/index.html`,
        downloadUrl: `https://cdn.iport.ru/rc-pirate/${timestamp}/html.zip`,
        err: null,
      });
      resolve();
    });
  });
}
