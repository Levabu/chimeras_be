const express = require("express");
const cors = require("cors");

require("dotenv").config();

const app = express();

app.use(cors());

app.use(express.json());

app.use('/images', express.static('public'));

app.use('/api/v1', require('./routers/apiRouter'));


// app.get("/token", async (req, res) => {
//     res.get("Authorization")
// });

app.listen(4000, () => {
  console.log("Server running on port 4000");
});
