const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Traffic Spike is running 🚀");
});

app.get("/ping", (req, res) => {
  res.json({
    message: "pong",
    totalRequests: 10
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});