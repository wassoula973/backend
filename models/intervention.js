const { Schema, model, Types } = require("mongoose");
const User = require("./user");
const Station = require("./station");

const interventionSchema = new Schema({
  etat: {
    type: String,
    enum: ["pending", "affected", "done", "canceled"],
    required: true,
    default: "pending",
  },
  category: {
    type: String,
    enum: ["fuite_citerne", "piste", "extincteur", "lavage", "retard"],
  },
  date: { type: Date, default: Date.now() },
  gerant: { type: Types.ObjectId, ref: User },
  station: { type: Types.ObjectId, ref: Station },
  technicien: {
    type: Types.ObjectId || undefined,
    ref: User,
    default: undefined,
  },
  image: String,
  error: { type: String, required: true },
  intensity: { type: String, enum: ["danger", "warning", "normal"] },
  deleted: { type: Boolean, default: false },
});

const Intervention = model("interventions", interventionSchema);

module.exports = Intervention;
