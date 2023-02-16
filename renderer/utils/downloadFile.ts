import axios from "axios";
import fs from "fs";

export const downloadFile = async (
  urlFrom: string,
  pathTo: string
): Promise<void> => {
  try {
    const response = await axios({
      method: "GET",
      url: urlFrom,
      responseType: "stream",
    });

    await response.data.pipe(fs.createWriteStream(pathTo));
  } catch (err) {
    console.log(err);
  }
};
