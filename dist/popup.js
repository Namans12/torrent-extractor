if (window.__TGX_ALREADY__) {
  console.log("Already injected");
} else {
  window.__TGX_ALREADY__ = true;

document.addEventListener("DOMContentLoaded", () => {

  async function getTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  document.getElementById("capture").onclick = async () => {
    const tab = await getTab();

    if (!tab || !tab.id) {
      alert("No active tab");
      return;
    }

    if (!tab.url.startsWith("http")) {
      alert("Open a real website");
      return;
    }

    try {
      // 🔥 ALWAYS inject fresh
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });

      // small delay to ensure load
      await new Promise(r => setTimeout(r, 200));

      await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE" });

    } catch (e) {
      console.error("Injection failed:", e);
      alert("Failed to start scraper. Refresh page.");
    }
  };

  document.getElementById("review").onclick = () => {
    chrome.runtime.openOptionsPage();
  };

  document.getElementById("clear").onclick = async () => {
    await chrome.runtime.sendMessage({ type: "CLEAR" });
    alert("Cleared");
  };

});
}