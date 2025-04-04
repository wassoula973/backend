const { Router } = require("express");
const jwt = require("jsonwebtoken");
const Station = require("../models/station");
const User = require("../models/user");
const { isConnected } = require("../middlewares");

const stationRouter = Router();

stationRouter.get("/", [isConnected], async (request, response) => {
  const stations = await Station.find({ deleted: false }).populate("gerant");
  response.send(stations);
});

stationRouter.get("/:id", [isConnected], async (request, response) => {
  const station = await Station.findById(request.params.id).populate("gerant");
  if (station) {
    response.send(station);
  } else response.status(404).send("not found");
});

stationRouter.post("/getbyassistant", [], async (request, response) => {
  const { gouvernorats } = request.body; // ["ben arous","tunis"]
  const stations = await Station.find({
    deleted: false,
    gouvernorat: { $in: gouvernorats },
  }).populate("gerant");
  response.send(stations);
});

stationRouter.post("/", [isConnected], (request, response) => {
  const { adresse, listmateriel, gerant } = request.body;
  const station = new Station({
    gerant,
    adresse,
    listmateriel,
  });
  station
    .save()
    .then(async (savedStation) => {
      const user = await User.findById(gerant);
      if (user) {
        user.station = savedStation._id;
        user
          .save()
          .then((savedUser) => {
            response.send({ station: savedStation, user: savedUser });
          })
          .catch((error) => {
            response.status(500).send(error);
          });
      }
    })
    .catch((error) => {
      response.status(500).send(error);
    });
});

stationRouter.put("/:id", [isConnected], async (request, response) => {
  const { adresse, listmateriel, gerant } = request.body;
  const station = await Station.findById(request.params.id);
  if (station) {
    station.adresse = adresse ? adresse : station.adresse;
    station.listmateriel = listmateriel ? listmateriel : station.listmateriel;
    station.gerant = gerant ? gerant : station.gerant;
    station
      .save()
      .then(async (savedStation) => {
        if (gerant) {
          const user = await User.findById(gerant).populate(["station"]);
          if (user) {
            user.station = savedStation._id;
            user
              .save()
              .then(async (savedUser) => {
                const populated = await savedUser.populate(["station"]);
                const token = jwt.sign(
                  { user: populated },
                  process.env.token_key
                );

                response.send({
                  station: savedStation,
                  user: populated,
                  token,
                });
              })
              .catch((error) => {
                response.status(500).send(error);
              });
          }
        } else response.send(savedStation);
      })
      .catch((error) => {
        response.status(500).send(error);
      });
  } else response.status(404).send("not found");
});

stationRouter.delete("/:id", [isConnected], async (request, response) => {
  const station = await Station.findById(request.params.id);
  if (station) {
    station.deleted = true;
    station
      .save()
      .then((savedStation) => {
        response.send(savedStation);
      })
      .catch((error) => {
        response.status(500).send(error);
      });
  } else response.status(404).send("not found");
});

module.exports = stationRouter;
