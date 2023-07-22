# E-commerce Shop API Server

This is a GraphQL API server for a shop application. It allows users to create an account, log in, manage products, and perform various operations related to the shop.

## Technologies Used
 - Express.js
 - Apollo Server 
 - MongoDB (Mongoose)
 - Firebase Storage (storing images in cloud)
 - JWT
 - Stripe

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
STRIPE_API_KEY=YourApiKey
CHECKOUT_SUCCESS=YourRedirectLink
CHECKOUT_CANCEL=YourRedirectLink
SENDGRID_KEY=SendGridKey
STRIPE_CURRENCY=YourCurrency
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

- Order: Stores order information such as products, total price and userId.



## Queries & Mutations

### Queries

1. getUser(userId: ID!): User!

- Description: Get a user by their userId.
- Input: 
    * userId (required): ID of the user.

2. login(email: String!, password: String!): AuthData!

- Description: Authenticate a user and get their authentication data(userId, token).
- Input:
    * email (required): Email of the user.
    * password (required): Password of the user.

3. getProducts: [Product!]!

- Description: Get all products available.
- Output: An array of Product objects.

4. getProduct(productId: ID!): Product!

- Description: Get a product by its productId.
- Input:
    * productId (required): ID of the product.

5. getCart: Cart!

- Description: Get the user's cart.
- Output: Cart object representing the user's cart.

6. resetPassword(email: String!): String!

- Description: Reset the user's password.
- Input:
    * email (required): Email of the user.
    * Output: A success message string.

7. getOrders: [Order!]!

- Description: Get all orders placed by the user.
- Output: An array of Order objects.

### Mutations

1. createNewUser(userData: UserData!): User!

- Description: Create a new user account.
- Input:
    * userData (required): Object containing user data including email, name, and password.
- Output: User object representing the created user.

2. createNewProduct(productData: ProductInput!): Product!

- Description: Create a new product.
- Input:
    * productData (required): Object containing product data including name, description, price, and imageUrl.
- Output: Product object representing the created product.

3. updateProduct(productData: ProductInput!, productId: ID!): Product!

- Description: Update an existing product by productId.
- Input:
    * productData (required): Object containing updated product data.
    * productId (required): ID of the product to be updated.
- Output: Product object representing the updated product.

4. deleteProduct(productId: ID!): Boolean!

- Description: Delete a product by productId.
- Input:
    * productId (required): ID of the product to be deleted.
- Output: A boolean indicating whether the deletion was successful.

5. addToCart(productId: ID!): Cart!

- Description: Add a product to the user's cart.
- Input:
    * productId (required): ID of the product to be added to the cart.
- Output: Cart object representing the updated cart.

6. removeFromCart(productId: ID!): Boolean!

- Description: Remove a product from the user's cart.
- Input:
    * productId (required): ID of the product to be removed from the cart.
- Output: A boolean indicating whether the removal was successful.

7. clearCart: Cart!

- Description: Clear the user's cart (remove all items).
- Output: Cart object representing the emptied cart.

8. checkout: CheckoutData!

- Description: Proceed with the cart checkout process.
- Output: CheckoutData object containing order details and payment information.

9. validateToken(token: String!): User!

- Description: Validate a user's token for authentication.
- Input:
    * token (required): User's authentication token.
- Output: User object representing the authenticated user.

10. changePassword(userId: ID!, newPassword: String!): String!

- Description: Change the user's password.
- Input:
    * userId (required): ID of the user.
    * newPassword (required): New password to be set for the user.
- Output: A success message string.


## Types:

+ User: Represents a user with properties like _id, email, name, password, products, and cart. 

+ Product: Represents a product with properties like _id, name, description, price, imageUrl, creator, createdAt, and updatedAt.

+ Order: Represents an order with properties like _id, user, products, totalPrice, and paymentIntentId.

+ OrderProduct: Represents a product within an order with properties like productId, quantity, and product.

+ AuthData: Represents authentication data with properties userId and token.

+ Cart: Represents a user's cart with the property items.

+ CartItem: Represents an item within a cart with properties like productId and quantity.

+ CheckoutData: Represents data related to the checkout process with properties like orderId and clientSecret.

+ ProductInput: Represents input data for creating or updating a product with properties like name, description, price, and imageUrl.

+ UserData: Represents input data for creating a new user with properties like email, name, and password.
