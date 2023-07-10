const { gql } = require("graphql-tag");

const typeDefs = gql`
  type Query {
    login(email: String!, password: String!): AuthData!
    getProducts: ProductData
    getProduct(productId: ID!): Product!
    getUser(userId: ID!): User!
    getCart: Cart!
  }

  type AuthData {
    token: String!
    userId: String!
  }

  type Order {
    _id: ID!
    products: [Cart!]!
    quantity: Int!
  }

  type CartItem {
    productId: ID!
    quantity: Int!
  }

  type Cart {
    items: [CartItem!]!
  }

  type User {
    _id: ID!
    name: String!
    email: String!
    password: String!
    products: [Product!]!
    cart: Cart!
  }

  input UserDataInput {
    name: String!
    email: String!
    password: String!
  }

  type Product {
    _id: ID
    name: String!
    description: String!
    price: Int!
    creator: User!
    imageUrl: String
    createdAt: String!
    updatedAt: String!
  }

  type ProductData {
    products: [Product!]!
  }

  input ProductInputData {
    name: String
    description: String
    price: Int
    imageUrl: String
  }

  type Mutation {
    createNewUser(userData: UserDataInput): User!
    createNewProduct(productData: ProductInputData): Product!
    updateProduct(productData: ProductInputData, prodId: ID!): Product!
    deleteProduct(productId: ID!): Boolean!
    addToCart(productId: ID!): Cart!
    removeFromCart(productId: ID!): Boolean!
  }
`;

module.exports = typeDefs;
