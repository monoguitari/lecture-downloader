const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const WebSocket = require("ws");
const app = express();
const port = 3000;

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: 8080 });

app.use(express.json());

app.post("/convert", (req, res) => {
  const { m3u8Url } = req.body;
  const outputFileName = `output_${Date.now()}.mp3`;

  if (!m3u8Url) {
    return res.status(400).send("Missing m3u8Url");
  }

  // Broadcast messages to WebSocket clients
  const broadcast = (message) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  };

  // Step 1: Download the HLS stream
  broadcast({ type: "status", message: "Downloading HLS stream..." });
  console.log("Downloading HLS stream...");

  const downloadProcess = spawn("ffmpeg", [
    "-protocol_whitelist",
    "file,http,https,tcp,tls,crypto",
    "-i",
    m3u8Url,
    "-c",
    "copy",
    "temp.mp4",
  ]);

  // Capture download progress
  downloadProcess.stderr.on("data", (data) => {
    console.log(`Download progress: ${data}`);
    broadcast({ type: "progress", message: data.toString() });
  });

  // Step 2: Convert to MP3 after download completes
  downloadProcess.on("close", (code) => {
    if (code !== 0) {
      broadcast({ type: "error", message: "Download failed" });
      console.error("Download failed");
      return res.status(500).send("Download failed");
    }

    broadcast({ type: "status", message: "Converting to MP3..." });
    console.log("Converting to MP3...");

    const convertProcess = spawn("ffmpeg", [
      "-i",
      "temp.mp4",
      "-vn",
      "-acodec",
      "libmp3lame",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-ab",
      "192k",
      outputFileName,
    ]);

    // Capture conversion progress
    convertProcess.stderr.on("data", (data) => {
      console.log(`Conversion progress: ${data}`);
      broadcast({ type: "progress", message: data.toString() });
    });

    // Step 3: Send the file and clean up
    convertProcess.on("close", (code) => {
      fs.unlinkSync("temp.mp4"); // Cleanup temp file

      if (code !== 0) {
        broadcast({ type: "error", message: "Conversion failed" });
        console.error("Conversion failed");
        return res.status(500).send("Conversion failed");
      }

      broadcast({ type: "status", message: "Sending MP3 file..." });
      console.log("Sending MP3 file...");

      res.download(outputFileName, (err) => {
        if (err) {
          broadcast({ type: "error", message: "Download failed" });
          console.error("Download failed:", err);
          return res.status(500).send("File download failed");
        }

        // Cleanup MP3 file after download
        fs.unlinkSync(outputFileName);
        broadcast({ type: "status", message: "Process complete!" });
        console.log("Process complete!");
      });
    });
  });
});

// Start servers
app.listen(port, () => {
  console.log(`HTTP server running at http://localhost:${port}`);
});

wss.on("listening", () => {
  console.log(`WebSocket server running at ws://localhost:8080`);
});
