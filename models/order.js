const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const Order = new Schema(
  {
    products: [
      {
        product: {
          type: Object,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],

    user: {
      email: {
        type: String,
        required: true,
      },
      userId: {
        type: Schema.Types.ObjectId,
      },
    },

    totalPrice: {
      type: Number,
      required: true,
    },

    paymentIntentId: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", Order);
