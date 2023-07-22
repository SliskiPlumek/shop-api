const express = require("express");
const { ApolloServer } = require("@apollo/server");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const { expressMiddleware } = require("@apollo/server/express4");
const depthLimit = require("graphql-depth-limit");
const cors = require("cors");
const bodyParser = require("body-parser");
const auth = require("@plumek/jwt-auth-express");
const multer = require("multer");
const firebase = require("firebase-admin");
const compression = require("compression");
const cache = require("memory-cache");
const { v4: uuidv4 } = require('uuid')

const resolvers = require("./graphql/resolvers");
const typeDefs = require("./graphql/typeDefs");

const app = express();
const serviceAccount = require("./serviceAccountKey.json");

const parser = bodyParser.json();

app.use(cors());

app.use(compression());

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
  validationRules: [depthLimit(5)],
  persistedQueries: {
    cache: new Map(),
  },
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

const cacheMiddleware = (duration) => (req, res, next) => {
  const key = "__express__" + req.originalUrl || req.url;

  const excludeFromCache = req.originalUrl.includes('/graphql');

  if (!excludeFromCache) {
    const cachedBody = cache.get(key);
    if (cachedBody) {
      res.send(cachedBody);
      return;
    } else {
      res.sendResponse = res.send;
      res.send = (body) => {
        cache.put(key, body, duration * 1000);
        res.sendResponse(body);
      };
      next();
    }
  } else {
    next();
  }
};


async function startServer() {
  await server.start();

  app.use(
    "/graphql",
    cors(),
    parser,
    cacheMiddleware(10),
    expressMiddleware(server, {
      context: ({ req }) => {
        return {
          req,
        };
      },
    })
  );

  app.post("/upload", upload.single("image"), async (req, res, next) => {
    try {
      if (!req.file) {
        throw new Error("No file uploaded");
      }
  
      const bucket = firebase.storage().bucket();
  
      const randomFilename = `${uuidv4()}_${req.file.originalname}`;
      const file = bucket.file(randomFilename);
  
      const [fileExists] = await file.exists();
      if (fileExists) {
        throw new Error("File with the same name already exists");
      }
  
      const blobStream = file.createWriteStream();
      blobStream.on("error", (error) => {
        throw error;
      });
      blobStream.on("finish", () => {
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
        res.status(200).json({ url: publicUrl });
      });
      blobStream.end(req.file.buffer);
    } catch (error) {
      next(error);
    }
  });
  
  

  await mongoose.connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.xmbmroe.mongodb.net/${process.env.MONGO_DEFAULT_DB}`,
    {maxPoolSize: 10}
  );
  console.log("DB connected");

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
