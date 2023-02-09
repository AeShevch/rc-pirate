import { NextApiRequest, NextApiResponse } from "next";
import { ParserFormFields } from "@/pages";
import { FileToCDNUpload } from "@/utils/getFilesUploadQueues";
import {sendFileToCloud} from "@/utils/sendFileToCloud";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { files } = req.query as { files: FileToCDNUpload[] };

  await Promise.all(files.map((file) => sendFileToCloud()));
  res.status(200);
}
