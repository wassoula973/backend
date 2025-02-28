const { Router } = require("express");
const { User } = require("../models/user");
const { isConnected } = require("../middlewares");

const adminRouter = Router();

adminRouter.get("/users", [isConnected], async (request, response) => {
  const users = await User.find();
  response.send(users);
});

adminRouter.get("/:id", [isConnected], async (request, response) => {
  const user = await User.findById(request.params.id);
  if (user) {
    response.send(user);
  } else response.status(404).send("not found");
});

module.exports = adminRouter;
