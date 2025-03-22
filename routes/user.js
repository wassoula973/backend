const { Router } = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const { isConnected } = require("../middlewares");
const Station = require("../models/station");

const userRouter = Router();

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

userRouter.get("/role/:role", [isConnected], async (request, response) => {
  const users = await User.find({ role: request.params.role });
  response.send(users);
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
        const userPopulated = await user.populate("station");
        const token = jwt.sign({ user: userPopulated }, process.env.token_key);
        response.send({ user: userPopulated, token });
      }
    } else response.status(405).send("password doesn't match");
  } else response.status(404).send("not found");
});

//register
userRouter.post("/", (request, response) => {
  const { firstname, lastname, cin, email, password, role, phone } =
    request.body;
  const hash = bcrypt.hashSync(password, 10);
  const user = new User({
    firstname,
    lastname,
    cin,
    email,
    password: hash,
    role,
    phone,
  });
  user
    .save()
    .then(async (savedUser) => {
      const userPopulated = await user.populate("station");
      const token = jwt.sign({ user: userPopulated }, process.env.token_key);
      response.send({ user: userPopulated, token });
    })
    .catch((error) => {
      response.status(500).send(error);
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
    phone,
    role,
    gouvernorats,
    listInterventions,
    listeQueries,
    station,
  } = request.body;

  const hash = password ? bcrypt.hashSync(password, 10) : "";
  const user = await User.findById(id);
  if (user) {
    user.firstname = firstname ? firstname : user.firstname;
    user.lastname = lastname ? lastname : user.lastname;
    user.cin = cin ? cin : user.cin;
    user.email = email ? email : user.email;
    user.password = password ? hash : user.password;
    user.phone = phone ? phone : user.phone;
    user.role = role ? role : user.role;
    user.gouvernorats =
      role == "assistant" || user.role == "assistant"
        ? gouvernorats
          ? gouvernorats
          : user.gouvernorats
        : undefined;
    user.station =
      role == "gerant" || user.role == "gerant"
        ? station
          ? station
          : user.station
        : undefined;
    user.listInterventions =
      role == "technicien" || user.role == "technicien"
        ? listInterventions
          ? listInterventions
          : user.listInterventions
        : undefined;
    user.listeQueries =
      role == "gerant" || user.role == "gerant"
        ? listeQueries
          ? listeQueries
          : user.listeQueries
        : undefined;

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
