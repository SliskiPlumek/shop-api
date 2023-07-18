require("dotenv").config();
const sendGrid = require("@sendgrid/mail");
const moment = require("moment");
const User = require("../models/user");

const API_KEY = process.env.SENDGRID_KEY;
sendGrid.setApiKey(API_KEY);

async function sendMail(email, resetToken) {
  const user = await User.findOne({ "resetToken.value": resetToken });

  if (!user) {
    const error = new Error("Invalid token");
    error.code = 401;
    throw error;
  }

  const expiration = moment().add(15, "minutes").toDate();

  user.resetToken.expiration = expiration;
  await user.save();

  const htmlMessage = `
  <body>
    <h1>Password Reset</h1>
    <p>Hello,</p>
    <p>We have received a request to reset your password. Please use the following reset token to proceed:</p>
    <p><strong>${user.resetToken.value}</strong></p>
    <p>Token Expiration: ${user.resetToken.expiration}</p> 
    <p>If you did not request a password reset, please disregard this email.</p>
    <p>Thank you!</p>
  </body>
  `;

  const plainMessage = `
  Password Reset

  Hello,
  
  We have received a request to reset your password. Please use the following reset token to proceed:
  
  ${user.resetToken.value}
  
  Token Expiration: ${user.resetToken.expiration} 
  
  If you did not request a password reset, please disregard this email.
  
  Thank you!
  `;

  try {
    const message = {
      to: email,
      from: {
        name: "Shop",
        email: "shop.mailbot@gmail.com",
      },
      subject: "Password Reset",
      text: plainMessage,
      html: htmlMessage,
    };

    await sendGrid.send(message);
  } catch (err) {
    throw err;
  }
}

module.exports = sendMail;
