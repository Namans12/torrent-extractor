if (!window.__TGX_ALREADY__) {
  window.__TGX_ALREADY__ = true;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SCRAPE") {
      console.log("SCRAPE triggered");
      scrapePage();
    }
  });
}

const SIZE_RE = /\b\d+(?:\.\d+)?\s?(?:TB|GB|MB|KB)\b/i;
const ADDED_RE = /\b(?:\d+\s(?:day|days|week|weeks|month|months|hour|hours)|today|yesterday)(?:,\s*\d+\s(?:day|days|week|weeks|month|months|hour|hours))?\b/i;

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getBestRowContainer(anchor, title) {
  const normalizedTitle = normalizeText(title);
  let best = null;
  let current = anchor.parentElement;
  let depth = 0;

  while (current && current !== document.body && depth < 8) {
    const text = normalizeText(current.innerText);

    if (text.includes(normalizedTitle)) {
      const size = text.match(SIZE_RE)?.[0] || "";
      const added = text.match(ADDED_RE)?.[0] || "";
      const childCount = current.children ? current.children.length : 0;
      const score = (size ? 10 : 0) + (added ? 10 : 0) + Math.min(childCount, 10);

      if (!best || score > best.score || (score === best.score && text.length < best.text.length)) {
        best = { node: current, score, text };
      }
    }

    current = current.parentElement;
    depth += 1;
  }

  return best?.node || anchor.parentElement || anchor;
}

function extractFieldText(container, regex) {
  if (!container) return "";

  const candidates = [container, ...(container.children ? Array.from(container.children) : [])];

  for (const candidate of candidates) {
    const text = normalizeText(candidate.innerText);
    const match = text.match(regex);

    if (match) {
      return match[0];
    }
  }

  return "";
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

    const container = getBestRowContainer(linkEl, name);
    let size = extractFieldText(container, SIZE_RE);
    let added = extractFieldText(container, ADDED_RE);

    if (!size || !added) {
      const bodyText = normalizeText(document.body.innerText);
      const nameIndex = bodyText.indexOf(normalizeText(name));

      if (nameIndex >= 0) {
        const windowText = bodyText.slice(Math.max(0, nameIndex - 40), nameIndex + 500);

        if (!size) {
          size = windowText.match(SIZE_RE)?.[0] || "";
        }

        if (!added) {
          added = windowText.match(ADDED_RE)?.[0] || "";
        }
      }
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