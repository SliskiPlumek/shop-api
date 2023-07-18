class CustomError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const handleError = (message, code) => {
  throw new CustomError(message, code);
};

module.exports = { handleError };
