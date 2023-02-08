import axios from "axios";
import https from "https";
import fs from "fs";

export const downloadImage = async (
  url: string,
  path: string
): Promise<void> => {
  try {
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
    });

    await response.data.pipe(fs.createWriteStream(path));
  } catch (err) {
    console.log(err);
  }
};
