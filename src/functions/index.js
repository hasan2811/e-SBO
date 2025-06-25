const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const Busboy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");

admin.initializeApp();

const storage = admin.storage();

exports.uploadPhoto = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method !== "POST") {
      return res.status(405).json({
        message: "Not allowed",
      });
    }

    const busboy = Busboy({ headers: req.headers });
    const tmpdir = os.tmpdir();
    const uploads = {};
    const fileWrites = [];

    busboy.on("file", (fieldname, file, info) => {
      const { filename, mimeType } = info;
      console.log(`Processing file: ${filename} (${mimeType})`);
      
      const filepath = path.join(tmpdir, filename);
      uploads[fieldname] = { filepath, mimeType };

      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);

      const promise = new Promise((resolve, reject) => {
        file.on("end", () => {
          writeStream.end();
        });
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
      fileWrites.push(promise);
    });

    busboy.on("finish", async () => {
      try {
        await Promise.all(fileWrites);
        
        const fieldname = Object.keys(uploads)[0];
        if (!fieldname) {
            throw new Error("No file uploaded.");
        }

        const { filepath, mimeType } = uploads[fieldname];
        const filename = path.basename(filepath);

        const bucket = storage.bucket("hssetech-e1710.appspot.com");
        
        const [uploadedFile] = await bucket.upload(filepath, {
          destination: `uploads/${Date.now()}-${filename}`,
          metadata: {
            contentType: mimeType,
          },
        });

        fs.unlinkSync(filepath);

        const downloadURL = await uploadedFile.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        });

        console.log(`File uploaded successfully. URL: ${downloadURL[0]}`);
        res.status(200).json({
          message: "File uploaded successfully",
          downloadUrl: downloadURL[0],
        });
      } catch (error) {
        console.error("Error during upload process:", error);
        res.status(500).json({
          message: "Could not upload the file.",
          error: error.message,
        });
      }
    });

    // Ini adalah baris kunci yang diperbaiki.
    // Menyalurkan request stream ke busboy.
    req.pipe(busboy);
  });
});
