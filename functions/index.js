const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const storage = admin.storage();

exports.uploadPhoto = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const busboy = require("busboy").default;

  const bb = busboy({headers: req.headers});
  let fileBuffer = Buffer.from("");
  let fileName = "";
  let mimeType = "";

  bb.on("file", (fieldname, file, filename, encoding, mimetype) => {
    fileName = filename;
    mimeType = mimetype;
    file.on("data", (data) => {
      fileBuffer = Buffer.concat([fileBuffer, data]);
    });
    file.on("end", () => {
      console.log("File received");
    });
  });

  bb.on("finish", async () => {
    const bucket = storage.bucket();
    // Store in a 'photos' folder
    const fileUpload = bucket.file(`photos/${fileName}`);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: mimeType,
      },
    });

    stream.on("error", (err) => {
      console.error("Error uploading file:", err);
      res.status(500).send("Error uploading file");
    });

    stream.on("finish", async () => {
      console.log("File uploaded successfully");
      // Optionally, get the download URL
      const [url] = await fileUpload.getSignedUrl({
        action: "read",
        expires: "03-09-2491", // Set an appropriate expiry date
      });
      res.status(200).send({url});
    });

    stream.end(fileBuffer);
  });

  bb.end(req.rawBody); // Use req.rawBody for the raw request body
});
