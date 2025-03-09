const { Router } = require("express");
const Intervention = require("../models/intervention");
const { isConnected } = require("../middlewares");
const multer = require("multer");
const nodemailer = require("nodemailer");
const User = require("../models/user");

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "younssiwissal3@gmail.com",
    pass: "kiapzllzosqjpvxe",
  },
});

var storage = multer.diskStorage({
  destination: "./images",
  filename: (request, image, cb) => {
    const extension =
      image.originalname.split(".")[image.originalname.split(".").length - 1];
    cb(null, image.originalname + "-" + Date.now() + "." + extension);
  },
});

var upload = multer({ storage });

const interventionRouter = Router();

interventionRouter.get("/", [isConnected], async (request, response) => {
  const interventions = await Intervention.find({ deleted: false });
  response.send(interventions);
});

interventionRouter.get("/:id", [isConnected], async (request, response) => {
  const intervention = await Intervention.findById(request.params.id).populate([
    "gerant",
    "station",
  ]);
  if (intervention) {
    response.send(intervention);
  } else response.status(404).send("not found");
});

interventionRouter.get(
  "/gerant/:id",
  [isConnected],
  async (request, response) => {
    const interventions = await Intervention.find({
      gerant: request.params.id,
    });
    response.send(interventions);
  }
);

interventionRouter.get(
  "/assistant/:id",
  [isConnected],
  async (request, response) => {
    const user = await User.findById(request.params.id);
    const interventions = await Intervention.find({
      "station.gouvernorat": "Tunis",
    }).populate(["gerant", "station"]);
    response.send(interventions);
  }
);

interventionRouter.post(
  "/",
  [isConnected, upload.single("image")],
  (request, response) => {
    const { gerant, station, error, intensity } = request.body;
    const imageName = request.file ? request.file.filename : "";
    const intervention = new Intervention({
      gerant,
      station,
      error,
      intensity,
      image: imageName,
    });
    intervention
      .save()
      .then(async (savedIntervention) => {
        const g = await User.findById(gerant);

        const contenu = {
          from: process.env.nodemailer_email,
          to: g.email,
          subject: "Ticket Id",
          html: "Ticket id : " + savedIntervention._id,
        };
        transport.sendMail(contenu, (error, mail) => {
          console.log({ error, mail });
        });
        response.send(savedIntervention);
      })
      .catch((error) => {
        response.status(500).send(error);
      });
  }
);

interventionRouter.put("/:id", [isConnected], async (request, response) => {
  const { etat, technicien, intensity } = request.body;
  const intervention = await Intervention.findById(request.params.id);
  if (intervention) {
    intervention.etat = etat ? etat : intervention.etat;
    intervention.technicien = technicien ? technicien : intervention.technicien;
    intervention.intensity = intensity ? intensity : intervention.intensity;
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

module.exports = interventionRouter;
