const User = require("../models/user");
const Product = require("../models/product");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const firebase = require("firebase-admin");
const validator = require("validator");

const resolvers = {
  Query: {
    getUser: async (_, { userId }) => {
      const user = await User.findById(userId).populate("products");

      if (!user) {
        const error = new Error("User with this id does not exist");
        error.code = 404;
        throw error;
      }

      return { ...user._doc, _id: user._id.toString() };
    },

    login: async (_, { email, password }) => {
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
    },

    getProduct: async (_, { productId }) => {
      const product = await Product.findById(productId.toString()).populate(
        "creator"
      );

      if (!product) {
        const error = new Error("No product found!");
        error.code = 404;
        throw error;
      }

      return {
        ...product._doc,
        _id: product._id.toString(),
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      };
    },

    getCart: async (_, __, {req}) => {
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

      const cart = user.cart.items
      return {items: cart}
    }
  },

  Mutation: {
    createNewUser: async (_, { userData }) => {
      const errors = [];

      if (!validator.isEmail(userData.email)) {
        errors.push({ message: "Invalid e-mail" });
      }

      if (
        validator.isEmpty(userData.password) ||
        !validator.isLength(userData.password, { min: 5 })
      ) {
        errors.push({ message: "Password too short" });
      }

      if (errors.length > 0) {
        const error = new Error("Invalid input");
        error.data = errors;
        error.code = 422;
        throw error;
      }

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

      if (
        validator.isEmpty(productData.name) ||
        !validator.isLength(productData.name, { min: 3 })
      ) {
        errors.push({ message: "Name is too short" });
      }

      if (
        validator.isEmpty(productData.description) ||
        !validator.isLength(productData.description, { min: 5 })
      ) {
        errors.push({ message: "Description is too short" });
      }

      if (errors.length > 0) {
        const error = new Error("Invalid input");
        error.data = errors;
        error.code = 422;
        throw error;
      }

      let imageUrl;

      if (productData.image) {
        const bucket = admin.storage().bucket();
        const file = bucket.file(productData.image.originalname);
        const blobStream = file.createWriteStream();
        blobStream.on("error", (error) => {
          throw error;
        });
        blobStream.on("finish", async () => {
          imageUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

          const newProduct = new Product({
            name: productData.name,
            description: productData.description,
            price: productData.price,
            imageUrl: imageUrl,
            creator: user,
          });

          try {
            const product = await newProduct.save();
            user.products.push(product._id);
            await user.save();

            return {
              ...product._doc,
              _id: product._id.toString(),
              createdAt: product.createdAt.toISOString(),
              updatedAt: product.updatedAt.toISOString(),
            };
          } catch (err) {
            console.log(err);
            throw err;
          }
        });
        blobStream.end(productData.image.buffer);
      } else {
        const newProduct = new Product({
          name: productData.name,
          description: productData.description,
          price: productData.price,
          creator: user,
        });

        try {
          const product = await newProduct.save();
          user.products.push(product._id);
          await user.save();

          return {
            ...product._doc,
            _id: product._id.toString(),
            createdAt: product.createdAt.toISOString(),
            updatedAt: product.updatedAt.toISOString(),
          };
        } catch (err) {
          console.log(err);
          throw err;
        }
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

      if (
        validator.isEmpty(productData.name) ||
        !validator.isLength(productData.name, { min: 5 })
      ) {
        errors.push({ message: "Name is invalid" });
      }

      if (
        validator.isEmpty(postInput.description) ||
        !validator.isLength(postInput.description, { min: 5 })
      ) {
        errors.push({ message: "Description is invalid" });
      }

      if (errors.length > 0) {
        const error = new Error("Invalid input");
        error.data = errors;
        error.code = 422;
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
        throw error;
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

      if (product.imageUrl !== "") {
        const bucket = firebase.storage().bucket();
        const file = bucket.file(product.imageUrl);
        await file.delete();
      }

      await user.save();
      return true;
    },

    addToCart: async (_, { productId }, { req }) => {
      if (!req.isAuth) {
        const error = new Error("User must be logged in!");
        error.code = 401;
        throw error;
      }

      const user = await User.findById(req.userId);

      if (!user) {
        const error = new Error("Not authorized!");
        error.code = 401;
        throw error;
      }

      const product = await Product.findById(productId.toString());

      if (!product) {
        const error = new Error("No product found");
        error.code = 404;
        throw error;
      }

      let newQuantity = 1;

      try {
        const cartItemIndex = user.cart.items.findIndex(
          item => item.productId.toString() === productId.toString()
        );

        if (cartItemIndex >= 0) {
          newQuantity = user.cart.items[cartItemIndex].quantity + 1;
          user.cart.items[cartItemIndex].quantity = newQuantity;
        } else {
          user.cart.items.push({
            productId: productId.toString(),
            quantity: newQuantity,
          });
        }

        await user.save();

        return { items: user.cart.items };
      } catch (err) {
        console.log(err);
        throw err;
      }
    },

    removeFromCart: async(_, {productId}, {req}) => {
      if (!req.isAuth) {
        const error = new Error("User must be logged in!");
        error.code = 401;
        throw error;
      }

      const user = await User.findById(req.userId);

      if (!user) {
        const error = new Error("Not authorized!");
        error.code = 401;
        throw error;
      }

      const cartItemIndex = user.cart.items.findIndex(
        (item) => item.productId.toString() === productId.toString()
      );

      if (cartItemIndex === -1) {
        const error = new Error("Item not found in cart!");
        error.code = 404;
        throw error;
      }
    
      user.cart.items.splice(cartItemIndex, 1);
      await user.save();
    
      return true
    }
  },
};

module.exports = resolvers;
