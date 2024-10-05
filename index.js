const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Note = require("./models/noteModel");

const app = express();
app.use(cors({}));
app.use(express.json());

const mongoURL = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_IP}:${process.env.MONGO_PORT}/?authSource=admin`;

// const mongoURL = `mongodb://localhost:27017/?authSource=admin`;

app.get("/notes", async (req, res) => {
  try {
    const notes = await Note.find();
    res.status(200).json({
      notes,
    });
  } catch (e) {
    console.log(e);

    res.status(400).json({
      status: "fail",
    });
  }
});

app.get("/notes/:id", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }
    return res.status(200).json({
      note,
    });
  } catch (e) {
    console.log(e);
    return res.status(400).json({
      status: "fail",
    });
  }
});

app.post("/notes", async (req, res) => {
  console.log(req.body);
  try {
    const note = await Note.create(req.body);

    return res.status(201).json({
      note,
    });
  } catch (e) {
    console.log(e);

    return res.status(400).json({
      status: "fail",
    });
  }
});

app.patch("/notes/:id", async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }
    res.status(200).json({
      note,
    });
  } catch (e) {
    console.log(e);
    return res.status(400).json({
      status: "fail",
    });
  }
});

app.delete("/notes/:id", async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    console.log(note);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }
    res.status(200).json({ status: "success" });
  } catch (e) {
    console.log(e);
    return res.status(400).json({
      status: "fail",
    });
  }
});

// Health check endpoint
app.get("/health", async (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongoStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  // Get system health details
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  const timestamp = new Date().toISOString();

  // Set memory usage thresholds (in MB)
  const memoryThresholds = {
    rss: 200, // Resident Set Size
    heapUsed: 150, // Heap used
  };

  const rssInMB = (memoryUsage.rss / 1024 / 1024).toFixed(2);
  const heapUsedInMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);

  const healthInfo = {
    status: mongoState === 1 && rssInMB < memoryThresholds.rss && heapUsedInMB < memoryThresholds.heapUsed ? "healthy" : "unhealthy",
    message: mongoState === 1 ? "Application is connected to MongoDB" : "Application is not connected to MongoDB",
    uptime: `${Math.floor(uptime / 60)} minutes ${Math.floor(uptime % 60)} seconds`,
    memoryUsage: {
      rss: `${rssInMB} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${heapUsedInMB} MB`,
      external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
    },
    memoryWarnings: {
      rss: rssInMB >= memoryThresholds.rss ? `Warning: RSS memory usage (${rssInMB} MB) exceeds the threshold of ${memoryThresholds.rss} MB.` : "Memory usage is within acceptable limits.",
      heapUsed: heapUsedInMB >= memoryThresholds.heapUsed ? `Warning: Heap used memory (${heapUsedInMB} MB) exceeds the threshold of ${memoryThresholds.heapUsed} MB.` : "Heap memory usage is within acceptable limits."
    },
    mongo: {
      state: mongoStates[mongoState],
      isConnected: mongoState === 1,
      suggestion: mongoState === 1 ? "No action needed. MongoDB is connected." : "Check MongoDB connection and restart the service if necessary.",
    },
    timestamp: timestamp,
  };

  // If MongoDB is connected and memory is within limits, return 200, otherwise return 500
  if (mongoState === 1 && rssInMB < memoryThresholds.rss && heapUsedInMB < memoryThresholds.heapUsed) {
    return res.status(200).json(healthInfo);
  } else {
    return res.status(500).json({
      ...healthInfo,
      actionableMessage: "Please review the warnings and take the appropriate actions: " +
        (mongoState !== 1 ? "Check MongoDB connection. " : "") +
        (rssInMB >= memoryThresholds.rss ? "Investigate high memory usage (RSS). " : "") +
        (heapUsedInMB >= memoryThresholds.heapUsed ? "Investigate high heap memory usage." : "")
    });
  }
});


mongoose
  .connect(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("succesfully connected to DB");
    app.listen(3000, () => console.log("Server is listening on PORT 3000"));
  })
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
