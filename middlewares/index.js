const jwt = require("jsonwebtoken");

const isConnected = (request, response, next) => {
  try {
    // Vérifie si le header Authorization est présent dans la requête
    if (request.header("Authorization")) {
      // Extrait le token du header (format: "Bearer <token>")
      const token = request.header("Authorization").split(" ")[1];
      //Vérifie et décode le token en utilisant la clé secrète
      const decoded = jwt.verify(token, process.env.token_key);
      // Ajoute les informations de l'utilisateur décodées à l'objet request
      request.user = decoded.user;
      next();
    } else response.status(400).send("no jwt token");
  } catch (error) {
    response.status(400).send(error);
  }
};

module.exports = { isConnected };
