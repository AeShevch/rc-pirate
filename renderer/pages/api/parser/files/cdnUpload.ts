import { NextApiRequest, NextApiResponse } from "next";
import { FileToCDNUpload } from "@/renderer/utils/getFilesUploadQueues";
import { sendFileToCloud } from "@/renderer/utils/sendFileToCloud";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { files } = req.query;

  if (!files) {
    console.log(
      `Err: api/parser/files/cdnUpload: no files get param in api request`
    );
    await res.status(500).json({ err: true });
    return;
  }

  const parsedFiles: FileToCDNUpload[] = JSON.parse(files as string);

  await Promise.all(
    parsedFiles.map((file) =>
      sendFileToCloud({
        ...file,
        callback: (err) => {
          if (err) console.log(err);
        },
      })
    )
  );

  await res.status(200).json({ ok: true });
}
