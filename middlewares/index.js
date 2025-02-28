const jwt = require("jsonwebtoken");

const isConnected = (request, response, next) => {
  try {
    if (request.header("Authorization")) {
      const token = request.header("Authorization").split(" ")[1];
      const decoded = jwt.verify(token, process.env.token_key);
      request.user = decoded.user;
      next();
    } else response.status(400).send("no jwt token");
  } catch (error) {
    response.status(400).send(error);
  }
};

module.exports = { isConnected };
