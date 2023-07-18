require("dotenv").config();
const sendGrid = require("@sendgrid/mail");

const API_KEY = process.env.SENDGRID_KEY;
sendGrid.setApiKey(API_KEY);

async function sendMail(order, email) {
  const plainMessage = `
  Invoice
  ------------------------------
  Total Price: $${order.totalPrice.toFixed(2)}
  ------------------------------
  Products:
  ${order.products
    .map((product) => {
      return `
      Name: ${product.product.name}
      Price: $${product.product.price.toFixed(2)}
      Quantity: ${product.quantity}
      --------------------------------
    `;
    })
    .join("")}
  `;

  const htmlMessage = `
  <h1>Invoice</h1>
  <table>
    <tr>
      <td><b>Total Price:</b></td>
      <td>$${order.totalPrice.toFixed(2)}</td>
    </tr>
  </table>
  <h2>Products</h2>
  <table>
    <tr>
      <th>Name</th>
      <th>Price</th>
      <th>Quantity</th>
    </tr>
    ${order.products
      .map((product) => {
        return `
        <tr>
          <td>${product.product.name}</td>
          <td>$${product.product.price.toFixed(2)}</td>
          <td>${product.quantity}</td>
        </tr>
      `;
      })
      .join("")}
  </table>
`;
  try {
    const message = {
      to: email,
      from: {
        name: "Shop",
        email: "shop.mailbot@gmail.com",
      },
      subject: "Purchase receipt",
      text: plainMessage,
      html: htmlMessage,
    };

    await sendGrid.send(message);
  } catch (err) {
    throw err
  }
}

module.exports = sendMail;
