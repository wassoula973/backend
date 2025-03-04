const { Schema, model, Types } = require("mongoose");
const Station = require("./station");

const userSchema = new Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  cin: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  gouvernorats: Array,
  role: {
    type: String,
    enum: ["technicien", "admin", "gerant", "assistant"],
    required: true,
  },
  listInterventions: { type: Array || undefined, default: undefined },
  listeQueries: { type: Array || undefined, default: undefined },
  station: { type: Types.ObjectId || undefined, ref: "stations" },
  deleted: { type: Boolean, default: false },
});

const User = model("users", userSchema);

module.exports = User;
