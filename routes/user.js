const { Router } = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const { isConnected } = require("../middlewares");
const Station = require("../models/station");

const userRouter = Router();
//127.0.0.1:2700/users
userRouter.get("/", [isConnected], async (request, response) => {
  const users = await User.find({ deleted: false }).populate("station");
  response.send(users);
});

userRouter.get("/:id", [isConnected], async (request, response) => {
  const user = await User.findById(request.params.id).populate("station");
  if (user) {
    response.send(user);
  } else response.status(404).send("not found");
});

//login
userRouter.post("/login", async (request, response) => {
  const { email, password } = request.body;
  const user = await User.findOne({ email });
  if (user) {
    if (bcrypt.compareSync(password, user.password)) {
      if (user.deleted) {
        response.status(406).send("user deleted");
      } else {
        const token = jwt.sign({ user }, process.env.token_key);
        response.send({ user, token });
      }
    } else response.status(405).send("password doesn't match");
  } else response.status(404).send("not found");
});

//register
userRouter.post("/", (request, response) => {
  const { firstname, lastname, cin, email, password, role } = request.body;
  const hash = bcrypt.hashSync(password, 10);
  const user = new User({
    firstname,
    lastname,
    cin,
    email,
    password: hash,
    role,
  });
  user
    .save()
    .then(async (savedUser) => {
      const token = jwt.sign({ user: savedUser }, process.env.token_key);
      response.send({ user: savedUser, token });
    })
    .catch((error) => {
      response.status(500).send({ test: "drfgsdfgfdsgfsdg", error });
    });
});

userRouter.put("/", [isConnected], async (request, response) => {
  const {
    id,
    firstname,
    lastname,
    cin,
    email,
    password,
    role,
    listInterventions,
    listeQueries,
    station,
  } = request.body;

  const hash = bcrypt.hashSync(password, 10);
  const user = await User.findById(id);
  if (user) {
    user.firstname = firstname ? firstname : user.firstname;
    user.lastname = lastname ? lastname : user.lastname;
    user.cin = cin ? cin : user.cin;
    user.email = email ? email : user.email;
    user.password = password ? hash : user.password;
    user.role = role ? role : user.role;
    user.station = station ? station : user.station;
    user.listInterventions = listInterventions
      ? listInterventions
      : user.listInterventions;
    user.listeQueries = listeQueries ? listeQueries : user.listeQueries;

    user
      .save()
      .then(async (savedUser) => {
        const populateUserResponse = await savedUser.populate("station");
        if (station) {
          const s = await Station.findById(station);
          if (s) {
            s.gerant = savedUser._id;
            s.save()
              .then((savedStation) => {
                response.send({
                  user: populateUserResponse,
                  station: savedStation,
                });
              })
              .catch((error) => {
                response.status(500).send(error);
              });
          } else response.status(404).send("not found");
        } else {
          response.send({ user: populateUserResponse });
        }
      })
      .catch((error) => {
        response.status(500).send(error);
      });
  } else response.status(404).send("not found");
});

userRouter.delete("/:id", [isConnected], async (request, response) => {
  const user = await User.findById(request.params.id);
  if (user) {
    user.deleted = true;
    user
      .save()
      .then(async (savedUser) => {
        const s = await savedUser.populate("station");
        response.send(s);
      })
      .catch((error) => {
        response.status(500).send(error);
      });
  } else response.status(404).send("not found");
});

module.exports = userRouter;
