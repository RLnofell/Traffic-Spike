require('dotenv').config();
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const { initRedis } = require("./src/config/redis");
const { monitorMiddleware } = require("./src/middleware/monitor");
const apiRoutes = require("./src/routes/api");

const app = express();
const PORT = process.env.PORT || 10000;

// Initialize Infrastructure
initRedis();

// Security & Base Middleware
app.use(morgan("tiny"));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Metrics & Monitoring Middleware
app.use(monitorMiddleware);

// API Routes
app.use("/", apiRoutes);

// Boot
app.listen(PORT, () => {
  console.log(`🚀 SYSTEM_ONLINE: http://localhost:${PORT} [Architecture: Clean/Modular]`);
});