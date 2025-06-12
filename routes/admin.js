const { Router, request } = require("express"); //Importe Router pour créer des routes Express
//Importe les modèles User, Station, Intervention ainsi que le middleware isConnected vérifie que l’utilisateur est connecté
const User = require("../models/user");
const { isConnected } = require("../middlewares");
const Station = require("../models/station");
const Intervention = require("../models/intervention");

const adminRouter = Router(); //Initialise un routeur Express dédié aux fonctionnalités de l’admin

adminRouter.get("/users", [isConnected], async (request, response) => {
  //Route GET /users : retourne tous les utilisateurs. Protégée par le middleware isConnected
  const users = await User.find().populate(["station"]); //Cherche tous les utilisateurs et "popule" leur station associée.
  response.send(users); //Renvoie la liste des utilisateurs au format JSON.
});

adminRouter.get("/users/gerants", [isConnected], async (request, response) => {
  //Route GET /users/gerants : retourne les utilisateurs avec rôle "gérant".
  const users = await User.find({ role: "gerant" }).populate(["station"]); //Recherche les utilisateurs dont le role est "gerant" et envoie les résultats.
  response.send(users);
});

adminRouter.get("/user/:id", [isConnected], async (request, response) => {
  //retourne les détails d’un utilisateur précis
  const user = await User.findById(request.params.id).populate(["station"]);
  //Cherche l’utilisateur par son id et popule la station.

  if (user) {
    response.send(user);
  } else response.status(404).send("not found");
});

adminRouter.patch("/user/:id", [isConnected], async (request, response) => {
  //change le champ deleted à false.

  const user = await User.findById(request.params.id);
  if (user) {
    user.deleted = false; //Met l’attribut deleted à false.

    user
      .save()
      .then((savedUser) => {
        response.send(savedUser);
      })
      .catch((error) => response.status(500).send(error));
  } else response.status(404).send("not found");
}); //Sauvegarde l'utilisateur modifié et renvoie la réponse ou une erreur.

adminRouter.delete(
  "/users/multiple",
  [isConnected],
  async (request, response) => {
    //Suppression logique de plusieurs utilisateurs

    const listId = request.body.listId;
    const users = await User.find({ _id: { $in: listId } }); //Cherche tous les utilisateurs dont l’ID est dans listId
    users.map((u) => {
      u.deleted = true;
      u.save()
        .then(() => {})
        .catch((error) => {});
    });

    response.send(users);
  }
); //Marque chaque utilisateur comme supprimé (deleted = true) puis renvoie la liste.

adminRouter.patch(
  "/users/multiple",
  [isConnected],
  async (request, response) => {
    //remet actifs plusieurs utilisateurs.
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
); //Marque chaque utilisateur comme actif (deleted = false)

adminRouter.get("/stations", [isConnected], async (request, response) => {
  //renvoie toutes les stations avec leur gérant.
  const stations = await Station.find().populate("gerant");
  response.send(stations);
});

adminRouter.patch(
  "/stations/multiple",
  [isConnected],
  async (request, response) => {
    //Restauration de plusieurs stations

    const listId = request.body.listId;
    const stations = await Station.find({ _id: { $in: listId } });
    stations.map((u) => {
      u.deleted = false;
      u.save()
        .then(() => {})
        .catch((error) => {});
    });
    response.send(stations);
  }
);

adminRouter.delete(
  "/stations/multiple",
  [isConnected],
  async (request, response) => {
    //Suppression logique de plusieurs stations

    const listId = request.body.listId;
    const stations = await Station.find({ _id: { $in: listId } });
    stations.map((u) => {
      u.deleted = true;
      u.save()
        .then(() => {})
        .catch((error) => {});
    });
    response.send(stations);
  }
);
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

adminRouter.get("/interventions", [isConnected], async (request, response) => {
  const interventions = await Intervention.find().populate([
    "gerant",
    "station",
  ]);
  response.send(interventions); // renvoie toutes les interventions avec les relations vers gérant et station.
});

adminRouter.patch(
  "/interventions/multiple",
  [isConnected],
  async (request, response) => {
    const listId = request.body.listId;
    const interventions = await Intervention.find({ _id: { $in: listId } });
    interventions.map((u) => {
      u.deleted = false;
      u.save()
        .then(() => {})
        .catch((error) => {});
    });

    response.send(interventions);
  }
); //remet plusieurs interventions .

adminRouter.delete(
  "/interventions/multiple",
  [isConnected],
  async (request, response) => {
    //Suppression logique de plusieurs interventions

    const listId = request.body.listId;
    const interventions = await Intervention.find({ _id: { $in: listId } });
    interventions.map((u) => {
      u.deleted = true;
      u.save()
        .then(() => {})
        .catch((error) => {});
    });
    response.send(interventions);
  }
);

adminRouter.patch(
  "/intervention/:id",
  [isConnected],
  async (request, response) => {
    //Restauration d’une seule intervention
    const intervention = await Intervention.findById(request.params.id);
    if (intervention) {
      intervention.deleted = false;
      intervention
        .save()
        .then((savedIntervention) => {
          response.send(savedIntervention);
        })
        .catch((error) => {
          response.status(500).send(error);
        });
    } else response.status(404).send("not found");
  }
);

adminRouter.patch(
  "/interventions/multipleCancel",
  [isConnected],
  async (request, response) => {
    const listId = request.body.listId;
    const interventions = await Intervention.find({ _id: { $in: listId } });
    interventions.map((u) => {
      if (u.etat == "pending") u.etat = "canceled";
      u.save()
        .then(() => {})
        .catch((error) => {});
    });

    response.send(interventions);
  }
); //cancel plusieurs interventions .

module.exports = adminRouter;
