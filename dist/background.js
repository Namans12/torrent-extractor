const KEY = "rows";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {

      // ================= SAVE =================
      if (msg.type === "SAVE") {
        const existing = (await chrome.storage.local.get(KEY))[KEY] || [];
        const incoming = Array.isArray(msg.rows) ? msg.rows : [];

        const merged = [...existing, ...incoming];

        // Remove duplicates safely
        const unique = new Map();
        merged.forEach(r => {
          if (r && r.link) {
            unique.set(r.link, r);
          }
        });

        await chrome.storage.local.set({ [KEY]: [...unique.values()] });
        sendResponse({ ok: true });
      }

      // ================= GET =================
      else if (msg.type === "GET") {
        const data = await chrome.storage.local.get(KEY);
        sendResponse({ rows: data[KEY] || [] });
      }

      // ================= CLEAR =================
      else if (msg.type === "CLEAR") {
        await chrome.storage.local.set({ [KEY]: [] });
        sendResponse({ ok: true });
      }

      // ================= EXPORT =================
      else if (msg.type === "EXPORT") {
        const data = (await chrome.storage.local.get(KEY))[KEY] || [];

        if (!data.length) {
          sendResponse({ ok: false, error: "No data to export" });
          return;
        }

        const headers = ["name", "size", "added", "magnet", "link"];

        const escapeCSV = (val) => {
          // do NOT wrap formulas in quotes
            if (val.startsWith("=HYPERLINK")) {
              return val;
            }

            return `"${String(val).replace(/"/g, '""')}"`;
        };

        const csvRows = data.map(r =>
          headers.map(h => {
            let val = r[h] || "";

            if (h === "magnet" && val.startsWith("magnet:")) {
              val = `=HYPERLINK("${val}","Open Magnet")`;
            }

            if (h === "link" && val.startsWith("http")) {
              val = `=HYPERLINK("${val}","View Page")`;
            }

            if (val.startsWith("=HYPERLINK")) {
              return val;
            }

            return `"${String(val).replace(/"/g, '""')}"`;
          }).join(",")
        );

        const csv = [headers.join(","), ...csvRows].join("\n");
        const url = `data:text/csv;charset=utf-8,${encodeURIComponent("\uFEFF" + csv)}`;

        await chrome.downloads.download({
          url,
          filename: `scraped-${Date.now()}.csv`,
          saveAs: true
        });

        sendResponse({ ok: true });
      }

      // ================= UNKNOWN =================
      else {
        sendResponse({ ok: false, error: "Unknown message type" });
      }

    } catch (err) {
      console.error("Extension Error:", err);
      sendResponse({ ok: false, error: err.message });
    }
  })();

  return true; // keep async alive
});