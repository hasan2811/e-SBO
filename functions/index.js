const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const busboy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");

admin.initializeApp();

const storage = admin.storage();

exports.uploadPhoto = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const bb = busboy({headers: req.headers});
    const tmpdir = os.tmpdir();

    let uploadData = null;
    let localFilePath = null;

    bb.on("file", (fieldname, file, info) => {
      const {filename, mimeType} = info;
      const filepath = path.join(tmpdir, filename);
      localFilePath = filepath;
      uploadData = {mimeType: mimeType, name: filename};
      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);
    });

    bb.on("finish", async () => {
      if (!uploadData || !localFilePath) {
        return res.status(400).send("No file uploaded.");
      }

      const bucket = storage.bucket();
      const destination = `photos/${uploadData.name}`;

      try {
        const [file] = await bucket.upload(localFilePath, {
          destination: destination,
          metadata: {
            contentType: uploadData.mimeType,
          },
        });

        fs.unlinkSync(localFilePath); // Clean up the temporary file

        const [url] = await file.getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });

        console.log(`File uploaded successfully to ${destination}`);
        res.status(200).send({url: url});
      } catch (err) {
        console.error("Error during upload process:", err);
        if (localFilePath) {
          fs.unlinkSync(localFilePath);
        }
        res.status(500).send("Error uploading file.");
      }
    });

    req.pipe(bb);
  });
});
