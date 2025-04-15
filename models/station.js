const { Schema, model, Types } = require("mongoose");
const User = require("./user");

const stationSchema = new Schema({
  adresse: { type: String, required: true }, // 120 rue de marseille
  gouvernorat: { type: String, required: true }, //ben arous
  listmateriel: { type: Array, required: true, default: [] },
  gerant: { type: Types.ObjectId || undefined, ref: "users" },
  deleted: { type: Boolean, default: false },
});

const Station = model("stations", stationSchema);

module.exports = Station;
