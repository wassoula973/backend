const { Router } = require("express"); // Framework pour créer des routes
const jwt = require("jsonwebtoken"); // Pour générer des tokens JWT
const Station = require("../models/station"); // Modèle Mongoose pour les stations
const User = require("../models/user"); // Modèle Mongoose pour les utilisateurs
const { isConnected } = require("../middlewares"); // Middleware d'authentification

const stationRouter = Router();
//Récupère toutes les stations non supprimées

stationRouter.get("/", [isConnected], async (request, response) => {
  // Recherche toutes les stations non supprimées et peuple les infos du gérant
  const stations = await Station.find({ deleted: false }).populate("gerant");
  response.send(stations);
});
//Récupère une station spécifique par son ID
stationRouter.get("/:id", [isConnected], async (request, response) => {
  const station = await Station.findById(request.params.id).populate("gerant");
  if (station) {
    response.send(station);
  } else response.status(404).send("not found");
});
//Récupère les stations par gouvernorat (pour les assistants)
stationRouter.post("/getbyassistant", [], async (request, response) => {
  const { gouvernorats } = request.body; //  tableau de gouvernorat["ben arous","tunis"]
  // Recherche les stations non supprimées dans les gouvernorats spécifiés
  const stations = await Station.find({
    deleted: false,
    gouvernorat: { $in: gouvernorats }, // Opérateur MongoDB $in
  }).populate("gerant");
  response.send(stations);
});
//Crée une nouvelle station
stationRouter.post("/", [isConnected], (request, response) => {
  // Extraction des données de la requête
  const { adresse, listmateriel, gerant, gouvernorat } = request.body;
  // Création d'une nouvelle station
  const station = new Station({
    gerant,
    adresse,
    listmateriel,
    gouvernorat,
  });
  station
    .save()
    .then(async (savedStation) => {
      // Met à jour l'utilisateur gérant avec la référence à la nouvelle station
      const user = await User.findById(gerant);
      if (user) {
        user.station = savedStation._id;
        user
          .save()
          .then((savedUser) => {
            // Renvoie la station et l'utilisateur mis à jour
            response.send({ station: savedStation, user: savedUser });
          })
          .catch((error) => {
            response.status(500).send(error);
          });
      }
      // Si pas de gérant spécifié, renvoie juste la station
      else response.send(savedStation);
    })
    .catch((error) => {
      response.status(500).send(error);
    });
});

//Met à jour une station existante
stationRouter.put("/:id", [isConnected], async (request, response) => {
  const { adresse, listmateriel, gerant } = request.body;
  const station = await Station.findById(request.params.id);
  if (station) {
    // Met à jour les champs fournis (conservation des valeurs existantes si non fournies)
    station.adresse = adresse ? adresse : station.adresse;
    station.listmateriel = listmateriel ? listmateriel : station.listmateriel;
    station.gerant = gerant ? gerant : station.gerant;
    station
      .save()
      .then(async (savedStation) => {
        if (gerant) {
          // Si changement de gérant, met à jour l'utilisateur correspondant
          const user = await User.findById(gerant).populate(["station"]);
          if (user) {
            user.station = savedStation._id;
            user
              .save()
              .then(async (savedUser) => {
                // Génère un nouveau token avec les infos mises à jour
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
        } else response.send(savedStation); // Si pas de changement de gérant, renvoie juste la station
      })
      .catch((error) => {
        response.status(500).send(error);
      });
  } else response.status(404).send("not found");
});

// Suppression logique d'une station (soft delete)
stationRouter.delete("/:id", [isConnected], async (request, response) => {
  const station = await Station.findById(request.params.id);
  if (station) {
    station.deleted = true; // Marque comme supprimé sans suppression physique
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
