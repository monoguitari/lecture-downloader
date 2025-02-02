let m3u8Url = null;

// Listen for network requests
chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    // Check if the URL contains "index.m3u8" and if we haven't already captured a URL
    if (details.url.includes("index.m3u8") && !m3u8Url) {
      m3u8Url = details.url;
      console.log("Found M3U8 URL:", m3u8Url);

      // Save the URL to Chrome's local storage
      chrome.storage.local.set({ m3u8Url: m3u8Url }, function () {
        console.log("M3U8 URL saved:", m3u8Url);
      });
    }
  },
  { urls: ["<all_urls>"] } // Monitor all URLs
);

// Clear the URL when the tab is reloaded or updated
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === "loading") {
    m3u8Url = null;
    chrome.storage.local.remove("m3u8Url", function () {
      console.log("M3U8 URL cleared");
    });
  }
});

