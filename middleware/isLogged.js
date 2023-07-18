const User = require("../models/user");
const { handleError } = require("../util/error");

async function middleware(req) {
  if (!req.isAuth) {
    handleError("Not authorized", 401);
  }

  const user = await User.findById(req.userId);

  if (!user) {
    handleError("Not authorized", 401);
  }
}

module.exports = middleware;
