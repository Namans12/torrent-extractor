if (!window.__TGX_ALREADY__) {
  window.__TGX_ALREADY__ = true;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SCRAPE") {
      console.log("SCRAPE triggered");
      scrapePage();
    }
  });
}

async function scrapePage() {
  const links = [...document.querySelectorAll('a[href*="/post-detail/"]')];

  if (!links.length) {
    alert("No torrent rows found");
    return;
  }

  const rows = [];
  const seen = new Set();

  for (const linkEl of links) {
    const name = linkEl.innerText.trim();
    const link = new URL(linkEl.getAttribute("href"), location.href).href;

    if (!name || name.length < 4 || seen.has(link)) {
      continue;
    }

    const container = linkEl.closest("tr, li, article, section, div") || linkEl.parentElement;
    const text = (container?.innerText || "").replace(/\s+/g, " ").trim();

    const size = text.match(/\b\d+(?:\.\d+)?\s?(?:TB|GB|MB|KB)\b/i)?.[0] || "";
    const added = text.match(/\b(?:\d+\s(?:day|days|week|weeks|month|months|hour|hours)|today|yesterday)(?:,\s*\d+\s(?:day|days|week|weeks|month|months|hour|hours))?\b/i)?.[0] || "";

    if (!size && !added && !text.includes(name)) {
      continue;
    }

    seen.add(link);
    rows.push({ name, link, size, added });
  }

  const final = await Promise.allSettled(
    rows.map(async (row) => {
      try {
        const res = await fetch(row.link, { credentials: "include" });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const magnet = [...doc.querySelectorAll("a")]
          .find((a) => a.href.startsWith("magnet:"))?.href || "";

        return { ...row, magnet };
      } catch {
        return { ...row, magnet: "" };
      }
    })
  );

  const result = final
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);

  if (!result.length) {
    alert("No valid rows found");
    return;
  }

  chrome.runtime.sendMessage({ type: "SAVE", rows: result });

  alert(`Captured ${result.length} rows`);
}