# E-commerce Shop API Server

This is a GraphQL API server for a shop application. It allows users to create an account, log in, manage products, and perform various operations related to the shop.

## Technologies Used
 - Express.js
 - Apollo Server 
 - MongoDB (Mongoose)
 - Firebase Storage (storing images in cloud)
 - JWT

### Packages worth mension
 This project also uses:
 1. Security package for authenticating jwt
 ```bash
  npm install @plumek/jwt-auth-express
 ```
More about this package: 

[Git repo](https://github.com/SliskiPlumek/jwt-auth-express)

[npm link](https://www.npmjs.com/package/@plumek/jwt-auth-express?activeTab=readme)
## Setup Instructions

1. Clone the project

```bash
git clone https://github.com/SliskiPlumek/shop-api.git
```

2. Install dependencies

```bash
npm install
```

3. Create a .env file in the root directory and provide the necessary environment variables. Here are the variables used: 

```env
MONGO_USER=yourDBUser
MONGO_PASSWORD=YourDbPassword
MONGO_DEFAULT_DB=YourDefaultDB
JWT_SECRET=YourJWTSecret
STORAGE_BUCKET=YourFirebaseStorageBucket
```

4. Start the server

```bash
npm run start
```
The server will start running on the specified port (or the default port 3000).



## API Endpoints

- POST /graphql: The GraphQL endpoint for executing GraphQL queries and mutations. You can send your GraphQL requests to this endpoint.

- POST /upload: This endpoint allows you to upload an image file. The file is stored in Firebase Storage, and the endpoint returns the public URL of the uploaded file. Used with creating product mutation.


## Data Models

- User: Stores user information such as name, email, password, and products. The products field is an array of references to the associated products.

- Product: Stores product information such as name, description, price, image URL, creator, and timestamps. The creator field is a reference to the user who created the product.



## Queries & Mutations

### Queries

+ login(email, password) - Authenticates a user with their email and password and returns userId and jwt token to request object.

+ getProducts - Retrieves a list of products.

+ getUser(userId) - Retrieves a user by their id.

### Mutations

+ createNewUser(userData: {name: "", email: "", password: ""}) - Creates a new user.

+ createNewProduct(productData: {name: "", description: "", price: int, imageUrl: ""}) - Creates a new product.

+ updateProduct({same input as above, prodId: ""}) - Updates an existing product.

+ deleteProduct(productId: "") - Deletes a product and retrieves boolean.


## Project State

It is pre demo of project which might not include all of the features and might have issues. But this project is still in development so keep up with this repo and stay updated! I plan to deploy it on some hosting site in future.
