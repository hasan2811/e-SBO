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
  // Gunakan middleware cors untuk menangani pre-flight requests (OPTIONS)
  cors(req, res, () => {
    if (req.method !== "POST") {
      return res.status(405).json({
        message: "Not allowed",
      });
    }

    const busboy = Busboy({ headers: req.headers });
    const tmpdir = os.tmpdir();
    let filePath;
    let fileName;
    let fileMimeType;
    const uploads = {};

    busboy.on("file", (fieldname, file, info) => {
        const { filename, encoding, mimeType } = info;
        console.log(`File [${fieldname}]: filename: ${filename}, encoding: ${encoding}, mimeType: ${mimeType}`);
        
        fileName = filename;
        fileMimeType = mimeType;
        filePath = path.join(tmpdir, filename);
        uploads[fieldname] = { filePath, mimeType };

        const writeStream = fs.createWriteStream(filePath);
        file.pipe(writeStream);
    });

    busboy.on("finish", async () => {
      try {
        const bucket = storage.bucket("hssetech-e1710.appspot.com");
        
        const [uploadedFile] = await bucket.upload(filePath, {
          destination: `uploads/${Date.now()}-${fileName}`,
          metadata: {
            contentType: fileMimeType,
          },
        });

        // Hapus file temporary setelah upload
        fs.unlinkSync(filePath);

        // Buat URL yang bisa diakses publik
        const downloadURL = await uploadedFile.getSignedUrl({
            action: 'read',
            expires: '03-09-2491' // Tanggal di masa depan yang sangat jauh
        });

        res.status(200).json({
          message: "File uploaded successfully",
          downloadUrl: downloadURL[0],
        });
      } catch (error) {
        console.error("Error uploading to storage:", error);
        res.status(500).json({
          message: "Could not upload the file.",
          error: error.message,
        });
      }
    });
    
    // Kirimkan request ke busboy
    busboy.end(req.rawBody);
  });
});
