const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("CI/CD GitLab is working 🚀");
});

app.listen(PORT, () => {
  console.log("Server running on " + PORT);
});

console.log("9" + PORT);