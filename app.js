const express = require("express");
const { ApolloServer } = require("@apollo/server");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const { expressMiddleware } = require("@apollo/server/express4");
const cors = require("cors");
const bodyParser = require("body-parser");
const auth = require("@plumek/jwt-auth-express");
const multer = require("multer");
const firebase = require("firebase-admin");

const resolvers = require("./graphql/resolvers");
const typeDefs = require("./graphql/typeDefs");

const app = express();
const serviceAccount = require('./serviceAccountKey.json')

const parser = bodyParser.json()

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  storageBucket: process.env.STORAGE_BUCKET,
});

const secret = process.env.JWT_SECRET;
app.use(auth(secret));

const storage = multer.memoryStorage();
const upload = multer({ storage });

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    if (!error.originalError) {
      return error;
    }
    
    const data = error.data;
    const message = error.message || "An error occured";
    const code = error.originalError.code || 500;
    
    return { data: data, message: message, code: code };
  },
});


async function startServer() {
  await server.start();

  app.use(
    "/graphql",
    cors(),
    parser,
    expressMiddleware(server, {
      context: ({ req }) => {
        return {
          req: req,
          isAuth: req.isAuth,
          userId: req.userId
        }
      },
    })
  );

  app.post(
    "/upload",
    upload.single("image"),
    async (req, res, next) => {
      try {
        if (!req.file) {
          throw new Error("No file uploaded");
        }
  
        // Upload the file to Firebase Storage
        const bucket = firebase.storage().bucket();
        const file = bucket.file(req.file.originalname);
        const blobStream = file.createWriteStream();
        blobStream.on("error", (error) => {
          throw error;
        });
        blobStream.on("finish", () => {
          // Get the public URL of the uploaded file
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
          res.status(200).json({ url: publicUrl });
        });
        blobStream.end(req.file.buffer);
      } catch (error) {
        next(error);
      }
    }
  );

  await mongoose.connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.xmbmroe.mongodb.net/${process.env.MONGO_DEFAULT_DB}`
  );
  console.log("DB connected");

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
