// ✅ Always attach listener (NO guards)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SCRAPE") {
    console.log("SCRAPE triggered");
    enableSelection();
  }
});

let startX, startY, box;

function enableSelection() {
  console.log("Selection enabled");

  document.body.style.cursor = "crosshair";

  document.addEventListener("mousedown", onMouseDown, { once: true });
}

function onMouseDown(e) {
  startX = e.clientX;
  startY = e.clientY;

  box = document.createElement("div");

  Object.assign(box.style, {
    position: "fixed",
    border: "2px dashed red",
    background: "rgba(255,0,0,0.1)",
    zIndex: 999999
  });

  document.body.appendChild(box);

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

function onMouseMove(e) {
  const x = Math.min(e.clientX, startX);
  const y = Math.min(e.clientY, startY);
  const w = Math.abs(e.clientX - startX);
  const h = Math.abs(e.clientY - startY);

  Object.assign(box.style, {
    left: x + "px",
    top: y + "px",
    width: w + "px",
    height: h + "px"
  });
}

function onMouseUp(e) {
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);

  document.body.style.cursor = "default";

  const rect = box.getBoundingClientRect();
  box.remove();

  const elements = document.elementsFromPoint(
    rect.left + 5,
    rect.top + 5
  );

  const container = elements.find(el =>
    el.querySelectorAll && el.querySelectorAll("a").length > 20
  );

  if (!container) {
    alert("No valid area selected");
    return;
  }

  scrapeRows(container);
}

async function scrapeRows(container) {
  const rows = [];

  const all = container.querySelectorAll("div, tr");

  for (const row of all) {
    const links = row.querySelectorAll("a");
    if (!links.length) continue;

    let nameEl = null;
    let maxLen = 0;

    links.forEach(a => {
      const t = a.innerText.trim();
      if (t.length > maxLen) {
        maxLen = t;
        nameEl = a;
      }
    });

    if (!nameEl || maxLen < 12) continue;

    const link = nameEl.href;

    if (
      link.includes("user") ||
      link.includes("imdb") ||
      link.includes("get-posts")
    ) continue;

    const name = nameEl.innerText.trim();

    const size =
      row.innerText.match(/(\d+(\.\d+)?\s?(GB|MB))/i)?.[0] || "";

    const added =
      row.innerText.match(/(\d+\s+(days?|weeks?|months?))/i)?.[0] || "";

    rows.push({ name, link, size, added });
  }

  const unique = new Map();
  rows.forEach(r => unique.set(r.link, r));
  const clean = [...unique.values()];

  console.log("Rows found:", clean.length);

  const final = await Promise.allSettled(
    clean.map(async row => {
      try {
        const res = await fetch(row.link);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const magnet =
          [...doc.querySelectorAll("a")]
            .find(a => a.href.startsWith("magnet:"))?.href || "";

        return { ...row, magnet };
      } catch {
        return { ...row, magnet: "" };
      }
    })
  );

  const result = final
    .filter(r => r.status === "fulfilled")
    .map(r => r.value);

  chrome.runtime.sendMessage({ type: "SAVE", rows: result });

  alert(`Captured ${result.length} rows`);
}