const { gql } = require("graphql-tag");

const typeDefs = gql`
  type User {
    _id: ID!
    email: String!
    name: String!
    password: String!
    products: [Product!]
    cart: Cart!
  }

  type Product {
    _id: ID!
    name: String!
    description: String!
    price: Float!
    imageUrl: String
    creator: User!
    createdAt: String!
    updatedAt: String!
  }

  type Order {
    _id: ID!
    user: User!
    products: [OrderProduct!]!
    totalPrice: Float!
    paymentIntentId: String!
  }

  type OrderProduct {
    productId: String!
    quantity: Int!
    product: Product!
  }

  type AuthData {
    userId: ID!
    token: String!
  }

  type Cart {
    items: [CartItem!]
  }

  type CartItem {
    productId: Product!
    quantity: Int!
  }

  type CheckoutData {
    orderId: ID!
    clientSecret: String!
  }

  input ProductInput {
    name: String!
    description: String!
    price: Float!
    imageUrl: String
  }

  input UserData {
    email: String!
    name: String!
    password: String!
  }

  type Query {
    getUser(userId: ID!): User! 
    login(email: String!, password: String!): AuthData! 
    getProducts: [Product!]! 
    getProduct(productId: ID!): Product! 
    getCart: Cart! 
    resetPassword(email: String!): String! 
    getOrders: [Order!]!
  }

  type Mutation {
    createNewUser(userData: UserData!): User! 
    createNewProduct(productData: ProductInput!): Product! 
    updateProduct(productData: ProductInput!, productId: ID!): Product! 
    deleteProduct(productId: ID!): Boolean! 
    addToCart(productId: ID!): Cart! 
    removeFromCart(productId: ID!): Boolean! 
    clearCart: Cart! 
    checkout: CheckoutData!
    validateToken(token: String!): User! 
    changePassword(userId: ID!, newPassword: String!): String! 
  }
`;

module.exports = typeDefs;
