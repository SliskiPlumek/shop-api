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
const helmet = require('helmet')
const morgan = require('morgan')
const fs = require('fs')
const path = require('path')

const resolvers = require("./graphql/resolvers");
const typeDefs = require("./graphql/typeDefs");

const app = express();
const private_key = process.env.SERVICE_ACCOUNT_PRIVATE_KEY
const serviceAccount = {
  "type": process.env.SERVICE_ACCOUNT_TYPE,
  "project_id": process.env.SERVICE_ACCOUNT_PROJECT_ID,
  "private_key_id": process.env.SERVICE_ACCOUNT_PRIVATE_KEY_ID,
  "private_key": private_key.replace(/\\n/g, "\n"),
  "client_email": process.env.SERVICE_ACCOUNT_CLIENT_EMAIL,
  "client_id": process.env.SERVICE_ACCOUNT_CLIENT_ID,
  "auth_uri": process.env.SERVICE_ACCOUNT_AUTH_URI,
  "token_uri": process.env.SERVICE_ACCOUNT_TOKEN_URI,
  "auth_provider_x509_cert_url": process.env.SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL,
  "client_x509_cert_url": process.env.SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
  "universe_domain": process.env.SERVICE_ACCOUNT_UNIVERSE_DOMAIN
};


const parser = bodyParser.json();
const accessLogStream = fs.createWriteStream(path.join(__dirname, "access.log"), {flags: 'a'})

app.use(helmet())

app.use(cors());

app.use(compression());

app.use(morgan('combined', {stream: accessLogStream}))

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
    if(!req.isAuth) {
      throw new Error("Not authenticated")
    }

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

  const PORT = process.env.PORT || 3000;
  app.listen(PORT);
}

startServer();
