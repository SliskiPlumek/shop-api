const dotenv = require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const firebase = require("firebase-admin");
const validator = require("validator");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const stripe = require("stripe")(process.env.STRIPE_API_KEY);

const Product = require("../models/product");
const User = require("../models/user");
const Order = require("../models/order");
const resetMail = require("../mails/reset");
const receiptMail = require("../mails/receipt");

const isLoggedIn = require("../middleware/isLogged");
const { handleError } = require("../util/error");

const resolvers = {
  Query: {
    getUser: async (_, { userId }) => {
      const user = await User.findById(userId).populate("products");

      if (!user) {
        handleError("User with this id does not exist", 404);
      }

      return { ...user._doc, _id: user._id.toString() };
    },

    getProducts: async () => {
      const products = await Product.find().populate("creator");

      return products.map((prod) => ({
        ...prod._doc,
        _id: prod._id.toString(),
        createdAt: prod.createdAt.toISOString(),
        updatedAt: prod.updatedAt.toISOString(),
      }));
    },

    getProduct: async (_, { productId }) => {
      const product = await Product.findById(productId.toString()).populate(
        "creator"
      );

      if (!product) {
        handleError("No product found!", 404);
      }

      return {
        ...product._doc,
        _id: product._id.toString(),
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      };
    },

    getCart: async (_, __, { req }) => {
      const authorizationError = await isLoggedIn(req);

      if (authorizationError instanceof Error) {
        return {
          error: isLoggedIn.message,
        };
      }

      const user = await User.findById(req.userId).populate(
        "cart.items.productId"
      );

      const cart = user.cart.items;
      return { items: cart };
    },

    getOrders: async (_, __, { req }) => {
      const authorizationError = await isLoggedIn(req);

      if (authorizationError instanceof Error) {
        return {
          error: isLoggedIn.message,
        };
      }

      const user = await User.findById(req.userId);

      const orders = await Order.find({
        "user.userId": user._id.toString(),
      }).lean();

      return orders.map((order) => ({
        ...order,
        _id: order._id.toString(),
        user: {
          ...order.user,
          userId: order.user.userId.toString(),
        },
        createdAt: order.createdAt.toISOString(),
      }));
    },

    login: async (_, { email, password }) => {
      const user = await User.findOne({ email: email });

      if (!user) {
        handleError("No user with this email was found!", 404);
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        handleError("Invalid password!", 401);
      }

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
    },

    resetPassword: async (_, { email }) => {
      const user = await User.findOne({ email: email });

      if (!user) {
        handleError("No user with this email was found!", 404);
      }

      const token = uuidv4();

      user.resetToken = {
        value: token,
        expiration: undefined,
      };

      user.validToken = false;

      resetMail(email, token);

      await user.save();

      return "Reset link sent!";
    },
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
        handleError("User with this email exists already, please log in", 400);
      }

      try {
        const email = userData.email;
        const name = userData.name;
        const hashedPassword = await bcrypt.hash(userData.password, 16);

        const newUser = new User({
          email: email,
          name: name,
          password: hashedPassword,
          resetToken: {
            value: null,
            expiration: null,
          },
        });

        const user = await newUser.save();

        return { ...user._doc, _id: user._id.toString() };
      } catch (err) {
        throw err;
      }
    },

    createNewProduct: async (_, { productData }, { req }) => {
      const errors = [];

      const authorizationError = await isLoggedIn(req);

      if (authorizationError instanceof Error) {
        return {
          error: isLoggedIn.message,
        };
      }

      const user = await User.findById(req.userId);

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

          const product = await newProduct.save();
          user.products.push(product._id);
          await user.save();

          return {
            ...product._doc,
            _id: product._id.toString(),
            createdAt: product.createdAt.toISOString(),
            updatedAt: product.updatedAt.toISOString(),
          };
        });
        blobStream.end(productData.image.buffer);
      } else {
        const newProduct = new Product({
          name: productData.name,
          description: productData.description,
          price: productData.price,
          creator: user,
        });

        const product = await newProduct.save();
        user.products.push(product._id);
        await user.save();

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

      const authorizationError = await isLoggedIn(req);

      if (authorizationError instanceof Error) {
        return {
          error: isLoggedIn.message,
        };
      }

      const product = await Product.findById(prodId.toString()).populate(
        "creator"
      );

      if (!product) {
        handleError("Product not found!", 404);
      }

      const user = await User.findById(req.userId).populate("products");

      if (product.creator._id.toString() !== user._id.toString()) {
        handleError("The product does not belong to the current user!", 401);
      }

      if (
        validator.isEmpty(productData.name) ||
        !validator.isLength(productData.name, { min: 5 })
      ) {
        errors.push({ message: "Name is invalid" });
      }

      if (
        validator.isEmpty(productData.description) ||
        !validator.isLength(productData.description, { min: 5 })
      ) {
        errors.push({ message: "Description is invalid" });
      }

      if (errors.length > 0) {
        const error = new Error("Invalid input");
        error.data = errors;
        error.code = 422;
        throw error;
      }

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
    },

    deleteProduct: async (_, { productId }, { req }) => {
      const authorizationError = await isLoggedIn(req);

      if (authorizationError instanceof Error) {
        return {
          error: isLoggedIn.message,
        };
      }

      const product = await Product.findById(productId.toString()).populate(
        "creator"
      );
      if (!product) {
        handleError("Product not found!", 404);
      }

      const user = await User.findById(req.userId).populate("products");

      if (product.creator._id.toString() !== user._id.toString()) {
        handleError("Cannot manage other users products!", 401);
      }

      await Product.findByIdAndRemove(productId);
      user.products.pull(productId);

      if (product.imageUrl !== "" || product.imageUrl !== null) {
        const bucket = firebase.storage().bucket();
        const file = bucket.file(product.imageUrl);
        await file.delete();
      }

      await user.save();
      return true;
    },

    addToCart: async (_, { productId }, { req }) => {
      const authorizationError = await isLoggedIn(req);

      if (authorizationError instanceof Error) {
        return {
          error: isLoggedIn.message,
        };
      }

      const user = await User.findById(req.userId).populate({
        path: "cart.items.productId",
        model: "Product",
      });

      const product = await Product.findById(productId.toString());

      if (!product) {
        handleError("No product found", 404);
      }

      let newQuantity = 1;

      const cartItemIndex = user.cart.items.findIndex(
        (item) => item.productId._id.toString() === productId.toString()
      );

      const ownItemIndex = user.products.findIndex(
        (item) => item._id.toString() === productId.toString()
      );

      if (ownItemIndex >= 0) {
        handleError("Cannot add your own product to cart!", 400);
      }

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
    },

    removeFromCart: async (_, { productId }, { req }) => {
      const authorizationError = await isLoggedIn(req);

      if (authorizationError instanceof Error) {
        return {
          error: isLoggedIn.message,
        };
      }

      const user = await User.findById(req.userId);

      const cartItemIndex = user.cart.items.findIndex(
        (item) => item.productId.toString() === productId.toString()
      );

      if (cartItemIndex === -1) {
        handleError("Item not found in cart!", 404);
      }

      user.cart.items.splice(cartItemIndex, 1);
      await user.save();

      return true;
    },

    clearCart: async (_, __, { req }) => {
      const authorizationError = await isLoggedIn(req);

      if (authorizationError instanceof Error) {
        return {
          error: isLoggedIn.message,
        };
      }

      const user = await User.findById(req.userId);

      await user.populate("cart.items");

      user.cart.items = [];
      await user.save();

      return { items: user.cart.items };
    },

    validateToken: async (_, { token }) => {
      const user = await User.findOne({ "resetToken.value": token });

      if (!user) {
        handleError("Invalid token", 401);
      }

      const expiration = moment(user.resetToken.expiration);

      if (expiration.isBefore(moment())) {
        handleError("Token has expired!", 401);
      }

      user.validToken = true;
      await user.save();

      return { ...user._doc, _id: user._id.toString() };
    },

    changePassword: async (_, { userId, newPassword }) => {
      const user = await User.findById(userId);

      if (!user) {
        handleError("User not found", 401);
      }

      if (user.validToken !== true) {
        handleError("Invalid token", 401);
      }

      if (!user.resetToken.value) {
        handleError("Invalid token", 401);
      }

      const errors = [];

      if (
        validator.isEmpty(newPassword) ||
        !validator.isLength(newPassword, { min: 5 })
      ) {
        errors.push({ message: "Password too short" });
      }

      if (errors.length > 0) {
        const error = new Error("Invalid input");
        error.data = errors;
        error.code = 422;
        throw error;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 16);

      user.password = hashedPassword;
      user.resetToken = {
        value: null,
        expiration: null,
      };
      user.validToken = false;
      await user.save();

      return "Password changed!";
    },

    checkout: async (_, __, { req }) => {
      const authorizationError = await isLoggedIn(req);

      if (authorizationError instanceof Error) {
        return {
          error: isLoggedIn.message,
        };
      }

      const user = await User.findById(req.userId).populate(
        "cart.items.productId"
      );

      if (user.cart.items.length === 0) {
        handleError("Cannot checkout with an empty cart!", 400);
      }

      const cartProducts = user.cart.items.map((item) => ({
        _id: item.productId._id.toString(),
        name: item.productId.name,
        description: item.productId.description,
        price: item.productId.price,
        imageUrl: item.productId.imageUrl,
        quantity: item.quantity,
      }));

      let total = 0;

      cartProducts.forEach((item) => {
        total += item.price * item.quantity;
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: cartProducts.map((p) => ({
          price_data: {
            currency: process.env.STRIPE_CURRENCY,
            unit_amount: p.price * 100,
            product_data: {
              name: p.name,
              description: p.description,
            },
          },
          quantity: p.quantity,
        })),
        mode: "payment",
        success_url: process.env.CHECKOUT_SUCCESS,
        cancel_url: process.env.CHECKOUT_CANCEL,
      });

      const order = new Order({
        user: {
          userId: user._id.toString(),
          email: user.email,
        },

        products: cartProducts.map((product) => ({
          productId: product._id.toString(),
          quantity: product.quantity,
          product: product,
        })),

        totalPrice: total,
      });

      await order.save();

      // if (session && session.payment_status === "paid") {
      receiptMail(order, user.email);
      // }

      user.cart.items = [];
      await user.save();

      return {
        orderId: order._id,
        clientSecret: session.client_secret,
      };
    },
  },
};

module.exports = resolvers;
