const { Router } = require("express");
const Intervention = require("../models/intervention");
const { isConnected } = require("../middlewares");
const multer = require("multer");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const Station = require("../models/station");
const jwt = require("jsonwebtoken");
//Importation des modules nécessaires : Express pour le routage, Mongoose pour accéder aux modèles, middleware isConnected pour vérifier l’authentification, multer pour la gestion des fichiers image, nodemailer pour l’envoi d’e-mails, et jsonwebtoken pour générer un token JWT.

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "younssiwissal3@gmail.com",
    pass: "kiapzllzosqjpvxe", // À stocker dans une variable d'environnement
  },
}); //Création d’un transporteur pour envoyer des mails via Gmail.

var storage = multer.diskStorage({
  // Définit le dossier de destination pour les fichiers uploadés
  destination: "./images",
  filename: (request, image, cb) => {
    const extension = // Extraction de l'extension du fichier original
      // On split le nom du fichier par les points
      image.originalname.split(".")[image.originalname.split(".").length - 1]; // On prend le dernier élément du tableau (l'extension)
    cb(null, image.originalname + "-" + Date.now() + "." + extension);
  },
});

var upload = multer({ storage }); // Configuration de Multer pour gérer l'upload de fichiers

const interventionRouter = Router(); // Création d'un routeur Express pour les interventions

interventionRouter.get("/", [isConnected], async (request, response) => {
  const interventions = await Intervention.find({ deleted: false });
  response.send(interventions); // Route GET pour récupérer toutes les interventions non supprimées
});
//récupérer une intervention spécifique par son ID
interventionRouter.get("/:id", [isConnected], async (request, response) => {
  const intervention = await Intervention.findById(request.params.id).populate([
    "gerant", // Remplit les détails du gérant
    "station", // Remplit les détails de la station
    "technicien", // Remplit les détails du technicien
  ]);
  if (intervention) {
    response.send(intervention);
  } else response.status(404).send("not found");
});
//récupérer les interventions d'un gérant spécifique
interventionRouter.get(
  "/gerant/:id",
  [isConnected],
  async (request, response) => {
    const interventions = await Intervention.find({
      gerant: request.params.id, // Filtre par ID du gérant
    }).populate(["gerant", "station", "technicien"]);
    response.send(interventions);
  }
);
//récupérer les interventions d'un technicien spécifique
interventionRouter.get(
  "/technicien/:id",
  [isConnected],
  async (request, response) => {
    const interventions = await Intervention.find({
      deleted: false,
      technicien: request.params.id,
    }).populate(["gerant", "station", "technicien"]);
    response.send(interventions);
  }
);
//récupérer les interventions filtrées par gouvernorat d'un assistant
interventionRouter.get(
  "/assistant/:id",
  [isConnected],
  async (request, response) => {
    const user = await User.findById(request.params.id);
    // Récupère toutes les interventions non supprimées
    const interventions = await Intervention.find({ deleted: false }).populate([
      "gerant",
      "station",
      "technicien",
    ]);
    // Filtre les interventions selon les gouvernorats de l'assistant
    const filtredInterventions = interventions.filter((i) => {
      return user.gouvernorats.includes(i.station.gouvernorat);
    });
    response.send(filtredInterventions);
  }
);
//créer une nouvelle intervention avec upload d'image
interventionRouter.post(
  "/",
  [isConnected, upload.single("image")], // Middleware pour upload d'un seul fichier (champ "image")
  (request, response) => {
    // Extraction des données du corps de la requête
    const { gerant, station, error, intensity, category, material } =
      request.body;
    // Récupère le nom du fichier image s'il existe
    const imageName = request.file ? request.file.filename : "";
    console.log(imageName);
    // Crée une nouvelle intervention
    const intervention = new Intervention({
      gerant,
      station,
      error,
      intensity,
      category,
      image: imageName,
    });
    // Sauvegarde l'intervention
    intervention
      .save()
      .then(async (savedIntervention) => {
        // Récupère le gérant et la station concernés
        const g = await User.findById(gerant);
        const s = await Station.findById(station);
        // Met à jour l'état du matériel en panne
        const temp = s.listmateriel.map((m) => {
          return m.id == material ? { ...m, etat: "en panne" } : m;
        });

        s.listmateriel = temp;
        // Sauvegarde les modifications de la station
        s.save()
          .then(async () => {
            // Envoie un email au gérant avec l'ID de l'intervention
            const contenu = {
              from: process.env.nodemailer_email,
              to: g.email,
              subject: "Ticket Id",
              html: "Ticket id : " + savedIntervention._id,
            };
            transport.sendMail(contenu, (error, mail) => {
              console.log({ error, mail });
            });
            // Prépare la réponse avec l'intervention, l'utilisateur et un nouveau token
            const userPopulated = await g.populate("station");
            const token = jwt.sign(
              { user: userPopulated },
              process.env.token_key
            );
            response.send({
              intervention: savedIntervention,
              user: userPopulated,
              token,
            });
          })
          .catch((error) => {
            response.status(502).send(error);
          });
      })
      .catch((error) => {
        response.status(500).send(error);
      });
  }
);
//pour mettre à jour une intervention
interventionRouter.put("/:id", [isConnected], async (request, response) => {
  const { etat, technicien, intensity, category } = request.body;
  const intervention = await Intervention.findById(request.params.id);
  if (intervention) {
    // Met à jour les champs si fournis
    intervention.etat = etat ? etat : intervention.etat;
    intervention.technicien = technicien ? technicien : intervention.technicien;
    intervention.intensity = intensity ? intensity : intervention.intensity;
    intervention.category = category ? category : intervention.category;
    intervention
      .save()
      .then(async (savedIntervention) => {
        if (technicien) {
          // Si un technicien est assigné, envoie un email de notification
          const user = await User.findById(technicien);
          if (user) {
            const populated = await savedIntervention.populate([
              "gerant",
              "station",
            ]);
            console.log(populated);

            const contenu = {
              from: process.env.nodemailer_email,
              to: user.email,
              subject:
                "Affectation to intervention id:" + savedIntervention._id,
              html: `You're affected to intervention with id : ${
                populated._id
              } to station in ${populated.station.gouvernorat} . Gerant : ${
                populated.gerant.firstname
              } ${populated.gerant.lastname}  ${
                populated.gerant.phone
                  ? "phone number : " + populated.gerant.phone
                  : ""
              }`,
            };
            transport.sendMail(contenu, (error, mail) => {
              console.log({ error, mail });
              response.send(savedIntervention);
            });
          } else response.status(404).send("not found");
        } else response.send(savedIntervention);
      })
      .catch((error) => {
        response.status(500).send(error);
      });
  } else response.status(404).send("not found");
});
//  pour marquer une intervention comme supprimée (soft delete)
interventionRouter.delete("/:id", [isConnected], async (request, response) => {
  const intervention = await Intervention.findById(request.params.id);
  if (intervention) {
    intervention.deleted = true;
    intervention
      .save()
      .then((savedIntervention) => {
        response.send(savedIntervention);
      })
      .catch((error) => {
        response.status(500).send(error);
      });
  } else response.status(404).send("not found");
});
// Exporte le routeur pour utilisation dans l'application principale
module.exports = interventionRouter;
