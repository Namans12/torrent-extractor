document.addEventListener("DOMContentLoaded", async () => {

  const res = await chrome.runtime.sendMessage({ type: "GET" });
  const rows = res.rows || [];

  if (!rows.length) {
    document.getElementById("tbody").innerHTML =
      "<tr><td colspan='5'>No data</td></tr>";
    return;
  }

  const headers = [
    { key: "sno", label: "S.No" },
    { key: "name", label: "Name" },
    { key: "magnet", label: "Magnet Link" },
    { key: "size", label: "Size" },
    { key: "added", label: "Added" }
  ];

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  document.getElementById("thead").innerHTML =
    `<tr>${headers.map(h => `<th>${h.label}</th>`).join("")}</tr>`;

  document.getElementById("tbody").innerHTML =
    rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${row.magnet ? `<a href="${escapeHtml(row.magnet)}" target="_blank" rel="noreferrer noopener">Open Magnet</a>` : ""}</td>
        <td>${escapeHtml(row.size)}</td>
        <td>${escapeHtml(row.added)}</td>
      </tr>
    `).join("");

  document.getElementById("export").onclick = async () => {
    const response = await chrome.runtime.sendMessage({ type: "EXPORT" });

    if (!response?.ok) {
      alert(response?.error || "Export failed");
    }
  };

});