document.addEventListener("DOMContentLoaded", async () => {

  const res = await chrome.runtime.sendMessage({ type: "GET" });
  const rows = res.rows || [];

  if (!rows.length) {
    document.getElementById("tbody").innerHTML =
      "<tr><td>No data</td></tr>";
    return;
  }

  const headers = Object.keys(rows[0]);

  document.getElementById("thead").innerHTML =
    `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;

  document.getElementById("tbody").innerHTML =
    rows.map(r => `
      <tr>
        ${headers.map(h => `<td>${r[h] || ""}</td>`).join("")}
      </tr>
    `).join("");

  document.getElementById("export").onclick = async () => {
    await chrome.runtime.sendMessage({ type: "EXPORT" });
  };

});