const { Router } = require("express");
const Intervention = require("../models/intervention");
const { isConnected } = require("../middlewares");

const interventionRouter = Router();

interventionRouter.get("/", [isConnected], async (request, response) => {
  const interventions = await Intervention.find({ deleted: false });
  response.send(interventions);
});

interventionRouter.get("/:id", [isConnected], async (request, response) => {
  const intervention = await Intervention.findById(request.params.id);
  if (intervention) {
    response.send(intervention);
  } else response.status(404).send("not found");
});

interventionRouter.post("/", [isConnected], (request, response) => {
  const { gerant, station, error, intensity } = request.body;

  const intervention = new Intervention({
    gerant,
    station,
    error,
    intensity,
  });
  intervention
    .save()
    .then((savedIntervention) => {
      response.send(savedIntervention);
    })
    .catch((error) => {
      response.status(500).send(error);
    });
});

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
