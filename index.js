const express = require("express");
const { connect } = require("mongoose");
const userRouter = require("./routes/user");
const adminRouter = require("./routes/admin");
const { config } = require("dotenv");
const cors = require("cors");
const stationRouter = require("./routes/station");
const interventionRouter = require("./routes/intervention");
config();

const app = express();
const port = 2700;

app.use(cors());
app.use(express.json());

app.use("/users", userRouter); //127.0.0.1:2700/users
app.use("/admin", adminRouter); //127.0.0.1:2700/admin
app.use("/stations", stationRouter); //127.0.0.1:2700/stations
app.use("/interventions", interventionRouter); //127.0.0.1:2700/interventions

connect("mongodb://127.0.0.1:27017/Agil")
  .then(() => {
    console.log("connected to db");
  })
  .catch((error) => {
    console.log(error);
  });

app.listen(port, () => {
  console.log(`the server is running on port ${port}`);
});
