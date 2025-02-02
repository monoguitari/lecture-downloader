document.addEventListener("DOMContentLoaded", function () {
  const urlElement = document.getElementById("url");
  const downloadButton = document.getElementById("downloadButton");
  const statusElement = document.getElementById("status");

  // Connect to WebSocket server
  const ws = new WebSocket("ws://localhost:8080");

  // Handle WebSocket messages
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "status":
        statusElement.textContent = data.message;
        break;
      case "progress":
        // Optional: Parse FFmpeg progress (e.g., "time=00:00:10")
        statusElement.textContent = `Progress: ${data.message}`;
        break;
      case "error":
        statusElement.textContent = `Error: ${data.message}`;
        downloadButton.disabled = false;
        break;
    }
  };

  // Fetch the M3U8 URL from storage
  chrome.storage.local.get("m3u8Url", function (data) {
    if (data.m3u8Url) {
      urlElement.textContent = data.m3u8Url;
      downloadButton.disabled = false;
    } else {
      urlElement.textContent = "No URL found yet.";
      downloadButton.disabled = true;
    }
  });

  // Handle the download button click
  downloadButton.addEventListener("click", function () {
    chrome.storage.local.get("m3u8Url", function (data) {
      if (data.m3u8Url) {
        downloadButton.disabled = true;
        statusElement.textContent = "Starting conversion...";

        // Send the URL to the Node.js server
        fetch("http://localhost:3000/convert", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            m3u8Url: data.m3u8Url,
          }),
        })
          .then((response) => {
            if (!response.ok) throw new Error("Server error");
            return response.blob();
          })
          .then((blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `output_${Date.now()}.mp3`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          })
          .catch((error) => {
            statusElement.textContent = `Error: ${error.message}`;
            downloadButton.disabled = false;
          });
      }
    });
  });
});
