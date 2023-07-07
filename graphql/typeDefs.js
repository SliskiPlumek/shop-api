const { gql } = require("graphql-tag");

const typeDefs = gql`
  type Query {
    login(email: String!, password: String!): AuthData
    getProducts: ProductData
    getUser(email: String!): User!
  }

  type AuthData {
    token: String!
    userId: String!
  }

  type User {
    _id: ID
    name: String!
    email: String!
    password: String!
    products: [Product!]!
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
    description: String
    imageUrl: String
    price: Int
    name: String
  }

  type Mutation {
    createNewUser(userData: UserDataInput): User!
    createNewProduct(productData: ProductInputData): Product!
    updateProduct(productData: ProductInputData, prodId: ID!): Product!
    deleteProduct(productId: ID!): Boolean!
  }
`;

module.exports = typeDefs;
