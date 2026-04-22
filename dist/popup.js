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
      await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE" });
    } catch (e) {
      console.error("Message failed:", e);
      alert("Content script not responding. Reload page.");
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