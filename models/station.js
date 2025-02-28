const { Schema, model, Types } = require("mongoose");
const User = require("./user");

const stationSchema = new Schema({
  adresse: { type: String, required: true },
  listmateriel: { type: Array, required: true },
  gerant: { type: Types.ObjectId, ref: "users" },
  deleted: { type: Boolean, default: false },
});

const Station = model("stations", stationSchema);

module.exports = Station;
