const User = require("../models/user");
const Product = require("../models/product");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const resolvers = {
  Query: {
    getUser: async (_, { userId }) => {
      const user = await User.findById(userId).populate("products");

      if (!user) {
        const error = new Error("User with this id does not exist");
        error.code = 404;
        throw error;
      }

      // user.products.shift()
      // await user.save()

      return { ...user._doc, _id: user._id.toString() };
    },

    login: async (_, { email, password }) => {
      const errors = [];

      const user = await User.findOne({ email: email });

      if (!user) {
        const error = new Error("No user with this email was found!");
        error.code = 404;
        throw error;
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        const error = new Error("Invalid password!");
        error.code = 401;
        throw error;
      }

      try {
        const secret = process.env.JWT_SECRET;
        const token = jwt.sign(
          {
            userId: user._id.toString(),
            email: user.email,
          },
          secret,
          { expiresIn: "10h" }
        );

        return { userId: user._id.toString(), token: token };
      } catch (err) {
        console.log(err);
        throw err;
      }
    },

    getProducts: async () => {
      const products = await Product.find().populate("creator");

      return {
        products: products.map((prod) => {
          return {
            ...prod._doc,
            _id: prod._id.toString(),
            createdAt: prod.createdAt.toISOString(),
            updatedAt: prod.updatedAt.toISOString(),
          };
        }),
      };
      // return {...products._doc}
    },
  },

  Mutation: {
    createNewUser: async (_, { userData }) => {
      const errors = [];

      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        const error = new Error(
          "User with this email exists already, please log in"
        );
        throw error;
      }

      try {
        const email = userData.email;
        const name = userData.name;
        const hashedPassword = await bcrypt.hash(userData.password, 16);

        const newUser = new User({
          email: email,
          name: name,
          password: hashedPassword,
        });
        const user = await newUser.save();

        return { ...user._doc, _id: user._id.toString() };
      } catch (err) {
        console.log(err);
      }
    },

    createNewProduct: async (_, { productData }, { req }) => {
      const errors = [];

      if (!req.isAuth) {
        const error = new Error("Not authorized");
        error.code = 401;
        throw error;
      }

      const user = await User.findById(req.userId);

      if (!user) {
        const error = new Error("Not authorized");
        error.code = 401;
        throw error;
      }

      let imageUrl;

      if (productData.image) {
        // Upload the image file
        const bucket = admin.storage().bucket();
        const file = bucket.file(productData.image.originalname);
        const blobStream = file.createWriteStream();
        blobStream.on("error", (error) => {
          throw error;
        });
        blobStream.on("finish", async () => {
          // Get the public URL of the uploaded image
          imageUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

          // Create the new product with the image URL
          const newProduct = new Product({
            name: productData.name,
            description: productData.description,
            price: productData.price,
            imageUrl: imageUrl,
            creator: user, // Set the creator as the user's ID
          });

          const product = await newProduct.save();
          user.products.push(product._id); // Push the product ID to the user's products array
          await user.save(); // Save the user

          return {
            ...product._doc,
            _id: product._id.toString(),
            createdAt: product.createdAt.toISOString(),
            updatedAt: product.updatedAt.toISOString(),
          };
        });
        blobStream.end(productData.image.buffer);
      } else {
        // Create the new product without an image URL
        const newProduct = new Product({
          name: productData.name,
          description: productData.description,
          price: productData.price,
          creator: user, // Set the creator as the user's ID
        });

        const product = await newProduct.save();
        user.products.push(product._id); // Push the product ID to the user's products array
        await user.save(); // Save the user

        return {
          ...product._doc,
          _id: product._id.toString(),
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString(),
        };
      }
    },

    updateProduct: async (_, { productData, prodId }, { req }) => {
      const errors = [];

      if (!req.isAuth) {
        const error = new Error("Not authorized");
        error.code = 401;
        throw error;
      }

      const product = await Product.findById(prodId.toString()).populate(
        "creator"
      );

      if (!product) {
        const error = new Error("Product not found!");
        error.code = 404;
        throw error;
      }

      const user = await User.findById(req.userId).populate("products");

      if (product.creator._id.toString() !== user._id.toString()) {
        const error = new Error(
          "The product does not belong to the current user!"
        );
        error.code = 401;
        throw error;
      }

      try {
        product.name = productData.name;
        product.price = productData.price;
        product.description = productData.description;

        if (productData.imageUrl !== undefined) {
          product.imageUrl = productData.imageUrl;
        }

        const updatedProduct = await product.save();
        return {
          ...updatedProduct._doc,
          _id: updatedProduct._id.toString(),
          createdAt: updatedProduct.createdAt.toISOString(),
          updatedAt: updatedProduct.updatedAt.toISOString(),
        };
      } catch (error) {
        console.log(error);
        throw error; // Make sure to rethrow the error
      }
    },

    deleteProduct: async (_, { productId }, { req }) => {
      if (!req.isAuth) {
        const error = new Error("Not authorized");
        error.code = 401;
        throw error;
      }

      const product = await Product.findById(productId.toString()).populate(
        "creator"
      );
      if (!product) {
        const error = new Error("Product not found!");
        error.code = 404;
        throw error;
      }

      const user = await User.findById(req.userId).populate("products");

      if (product.creator._id.toString() !== user._id.toString()) {
        const error = new Error("Cannot manage other users products!");
        error.code = 401;
        throw error;
      }

      await Product.findByIdAndRemove(productId);
      user.products.pull(productId);

      await user.save();
      return true;
    },
  },
};

module.exports = resolvers;
