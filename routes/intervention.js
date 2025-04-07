const { Router } = require("express");
const Intervention = require("../models/intervention");
const { isConnected } = require("../middlewares");
const multer = require("multer");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const Station = require("../models/station");
const jwt = require("jsonwebtoken");

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
    "technicien",
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
    }).populate(["gerant", "station", "technicien"]);
    response.send(interventions);
  }
);

interventionRouter.get(
  "/assistant/:id",
  [isConnected],
  async (request, response) => {
    const user = await User.findById(request.params.id);
    const interventions = await Intervention.find({ deleted: false }).populate([
      "gerant",
      "station",
      "technicien",
    ]);
    const filtredInterventions = interventions.filter((i) => {
      return user.gouvernorats.includes(i.station.gouvernorat);
    });
    response.send(filtredInterventions);
  }
);

interventionRouter.post(
  "/",
  [isConnected, upload.single("image")],
  (request, response) => {
    const { gerant, station, error, intensity, category, material } =
      request.body;
    const imageName = request.file ? request.file.filename : "";
    const intervention = new Intervention({
      gerant,
      station,
      error,
      intensity,
      category,
      image: imageName,
    });
    intervention
      .save()
      .then(async (savedIntervention) => {
        const g = await User.findById(gerant);
        const s = await Station.findById(station);

        const temp = s.listmateriel.map((m) => {
          return m.id == material ? { ...m, etat: "en panne" } : m;
        });

        s.listmateriel = temp;

        s.save()
          .then(async () => {
            const contenu = {
              from: process.env.nodemailer_email,
              to: g.email,
              subject: "Ticket Id",
              html: "Ticket id : " + savedIntervention._id,
            };
            // transport.sendMail(contenu, (error, mail) => {
            //   console.log({ error, mail });
            // });

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
            response.status(500).send(error);
          });
      })
      .catch((error) => {
        response.status(500).send(error);
      });
  }
);

interventionRouter.put("/:id", [isConnected], async (request, response) => {
  const { etat, technicien, intensity, category } = request.body;
  const intervention = await Intervention.findById(request.params.id);
  if (intervention) {
    intervention.etat = etat ? etat : intervention.etat;
    intervention.technicien = technicien ? technicien : intervention.technicien;
    intervention.intensity = intensity ? intensity : intervention.intensity;
    intervention.category = category ? category : intervention.category;
    intervention
      .save()
      .then(async (savedIntervention) => {
        if (technicien) {
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
