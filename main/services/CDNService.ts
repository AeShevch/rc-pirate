import { FileToCDNUpload } from "./ParserService";
import { sendFileToCloud } from "../utils/sendFileToCloud";

export class CDNService {
  public async upload(files: FileToCDNUpload[]): Promise<void> {
    if (!files) throw new Error(`No files to upload provided`);

    await Promise.all(
      files.map((file) =>
        sendFileToCloud({
          ...file,
          callback: (err) => {
            if (err) console.log(err);
          },
        })
      )
    );
  }
}
