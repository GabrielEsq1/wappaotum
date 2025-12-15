const API = window.API_BASE || (typeof location !== "undefined" ? `${location.origin}/api` : "http://localhost:3000");

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  return res.json();
}

async function loadStats() {
  if (!document.getElementById("stat-users")) return;
  const s = await fetchJSON(`${API}/stats`);
  document.getElementById("stat-users").textContent = s.users || 0;
  document.getElementById("stat-campaigns").textContent = s.active_campaigns || 0;
  document.getElementById("stat-conv").textContent = s.open_conversations || 0;
}

async function loadUsers() {
  const table = document.getElementById("users-table");
  if (!table) return;
  const users = await fetchJSON(`${API}/users`);
  const rows = users.map(u => `<tr><td>${u.name}</td><td>${u.phone}</td><td>${u.optin ? "opt-in" : "opt-out"}</td><td>${u.tags || ""}</td><td>${u.status || ""}</td></tr>`).join("");
  table.innerHTML = `<tr><th>Nombre</th><th>Teléfono</th><th>Opt-in</th><th>Tags</th><th>Estado</th></tr>${rows}`;
}

async function loadInbox() {
  const table = document.getElementById("inbox-table");
  if (!table) return;
  const rows = await fetchJSON(`${API}/inbox?limit=100`);
  const body = rows.map(r => `<tr><td>${r.name || ""}</td><td>${r.phone || ""}</td><td>${new Date(r.created_at).toLocaleString()}</td><td>${r.status}</td></tr>`).join("");
  table.innerHTML = `<tr><th>Nombre</th><th>Teléfono</th><th>Fecha</th><th>Estado</th></tr>${body}`;
}

async function importJSON() {
  const ta = document.getElementById("json-input");
  if (!ta) return;
  const arr = JSON.parse(ta.value || "[]");
  const res = await fetchJSON(`${API}/users/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arr)
  });
  await loadUsers();
}

async function importCSV() {
  const input = document.getElementById("csv-file");
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  const text = await file.text();
  await fetch(`${API}/users/import`, {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body: text
  });
  await loadUsers();
}

async function createCampaign() {
  const name = document.getElementById("campaign-name").value;
  const template = document.getElementById("campaign-template").value;
  const status = document.getElementById("campaign-status").value;
  const tags = document.getElementById("campaign-tags").value;
  const segment = {};
  if (status) segment.status = status;
  if (tags) segment.tags = tags;
  const json = await fetchJSON(`${API}/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, template, segment })
  });
  document.getElementById("campaign-id").value = json.id;
}

async function sendCampaign() {
  const id = document.getElementById("campaign-id").value;
  if (!id) return;
  await fetchJSON(`${API}/campaigns/${id}/send`, { method: "POST" });
}

window.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadUsers();
  loadInbox();
  const btnJson = document.getElementById("btn-import-json");
  if (btnJson) btnJson.addEventListener("click", importJSON);
  const btnCreate = document.getElementById("btn-create-campaign");
  if (btnCreate) btnCreate.addEventListener("click", createCampaign);
  const btnSend = document.getElementById("btn-send-campaign");
  if (btnSend) btnSend.addEventListener("click", sendCampaign);
  const btnCsv = document.getElementById("btn-import-csv");
  if (btnCsv) btnCsv.addEventListener("click", importCSV);
});
