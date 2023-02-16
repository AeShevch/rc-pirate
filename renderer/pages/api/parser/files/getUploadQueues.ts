import type { NextApiRequest, NextApiResponse } from "next";
import {
  FileToCDNUpload,
  getFilesUploadQueues,
} from "@/renderer/utils/getFilesUploadQueues";
import { Nullable } from "@/renderer/utils/types";
import path from "path";

export type FilesUploadQueuesResponsePayload = {
  filesUploadQueues: FileToCDNUpload[][];
  err: Nullable<string>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FilesUploadQueuesResponsePayload>
): Promise<void> {
  const filesUploadQueues = await getFilesUploadQueues(
    path.join(`/tmp`, `results`)
  );

  await res.status(200).json({
    filesUploadQueues,
    err: null,
  });
}
