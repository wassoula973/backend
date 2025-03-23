const { Router } = require("express");
const User = require("../models/user");
const { isConnected } = require("../middlewares");
const Station = require("../models/station");

const adminRouter = Router();

adminRouter.get("/users", [isConnected], async (request, response) => {
  const users = await User.find().populate(["station"]);
  response.send(users);
});

adminRouter.get("/user/:id", [isConnected], async (request, response) => {
  const user = await User.findById(request.params.id);

  if (user) {
    response.send(user);
  } else response.status(404).send("not found");
});

adminRouter.patch("/user/:id", [isConnected], async (request, response) => {
  const user = await User.findById(request.params.id);
  if (user) {
    user.deleted = false;
    user
      .save()
      .then((savedUser) => {
        response.send(savedUser);
      })
      .catch((error) => response.status(500).send(error));
  } else response.status(404).send("not found");
});

adminRouter.delete(
  "/users/multiple",
  [isConnected],
  async (request, response) => {
    const listId = request.body.listId;
    const users = await User.find({ _id: { $in: listId } });
    users.map((u) => {
      u.deleted = true;
      u.save()
        .then(() => {})
        .catch((error) => {});
    });

    response.send(users);
  }
);

adminRouter.patch(
  "/users/multiple",
  [isConnected],
  async (request, response) => {
    const listId = request.body.listId;
    const users = await User.find({ _id: { $in: listId } });
    users.map((u) => {
      u.deleted = false;
      u.save()
        .then(() => {})
        .catch((error) => {});
    });

    response.send(users);
  }
);

adminRouter.get("/stations", [isConnected], async (request, response) => {
  const stations = await Station.find().populate("gerant");
  response.send(stations);
});

// restore single
adminRouter.patch("/station/:id", [isConnected], async (request, response) => {
  const station = await Station.findById(request.params.id);
  if (station) {
    station.deleted = false;
    station
      .save()
      .then((savedStation) => {
        response.send(savedStation);
      })
      .catch((error) => response.status(500).send(error));
  } else response.status(404).send("not found");
});

module.exports = adminRouter;
