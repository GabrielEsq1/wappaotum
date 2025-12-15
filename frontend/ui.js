const API = (typeof location !== 'undefined') ? `${location.origin}/api` : 'http://localhost:3000';

function useFetch(url, deps = []) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(url).then(r => r.json()).then(j => { if (mounted) { setData(j); setLoading(false); } }).catch(e => { if (mounted) { setError(e); setLoading(false); } });
    return () => { mounted = false; };
  }, deps);
  return { data, loading, error };
}

function Sidebar({ active }) {
  return (
    <nav className="sidebar">
      <a href="/dashboard" className={active === 'dashboard' ? 'active' : ''}>Dashboard</a>
      <a href="/users" className={active === 'users' ? 'active' : ''}>Usuarios</a>
      <a href="/campaigns" className={active === 'campaigns' ? 'active' : ''}>Campañas</a>
      <a href="/inbox" className={active === 'inbox' ? 'active' : ''}>Inbox</a>
    </nav>
  );
}

function Card({ label, value }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="value">{value ?? 0}</div>
    </div>
  );
}

function Dashboard() {
  const { data } = useFetch(`${API}/stats`, []);
  return (
    <div className="page">
      <Sidebar active="dashboard" />
      <main>
        <h1>Dashboard</h1>
        <div className="cards">
          <Card label="Total contactos" value={data?.users} />
          <Card label="Campañas activas" value={data?.active_campaigns} />
          <Card label="Conversaciones abiertas" value={data?.open_conversations} />
        </div>
      </main>
    </div>
  );
}

function Users() {
  const { data: users, loading } = useFetch(`${API}/users`, []);
  const [jsonText, setJsonText] = React.useState('');
  const [csvFile, setCsvFile] = React.useState(null);

  async function importJSON() {
    try {
      const arr = JSON.parse(jsonText || '[]');
      await fetch(`${API}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arr) });
      location.reload();
    } catch {}
  }

  async function importCSV() {
    if (!csvFile) return;
    const text = await csvFile.text();
    await fetch(`${API}/users`, { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: text });
    location.reload();
  }

  return (
    <div className="page">
      <Sidebar active="users" />
      <main>
        <h1>Usuarios</h1>
        <section className="panel">
          <h2>Importar JSON</h2>
          <textarea rows={8} value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder='[{"name":"Juan","phone":"57300...","optin":true,"tags":"vip","status":"registered"}]' />
          <button onClick={importJSON}>Importar JSON</button>
        </section>
        <section className="panel">
          <h2>Importar CSV</h2>
          <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} />
          <small>Cabeceras: name,phone,email,optin,tags,status</small>
          <button onClick={importCSV}>Importar CSV</button>
        </section>
        <section className="panel">
          <h2>Lista</h2>
          {loading ? 'Cargando...' : (
            <table>
              <thead>
                <tr><th>Nombre</th><th>Teléfono</th><th>Opt-in</th><th>Tags</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {(users || []).map(u => (
                  <tr key={u.id}><td>{u.name}</td><td>{u.phone}</td><td>{u.optin ? 'opt-in' : 'opt-out'}</td><td>{u.tags || ''}</td><td>{u.status || ''}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

function Campaigns() {
  const [name, setName] = React.useState('');
  const [template, setTemplate] = React.useState('');
  const [status, setStatus] = React.useState('registered_not_active');
  const [tags, setTags] = React.useState('');
  const [campaignId, setCampaignId] = React.useState('');

  async function createCampaign() {
    const segment = {};
    if (status) segment.status = status;
    if (tags) segment.tags = tags;
    const res = await fetch(`${API}/campaigns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, template, segment }) });
    const json = await res.json();
    setCampaignId(json.id);
  }

  async function sendCampaign() {
    if (!campaignId) return;
    await fetch(`${API}/campaigns/${campaignId}/send`, { method: 'POST' });
  }

  return (
    <div className="page">
      <Sidebar active="campaigns" />
      <main>
        <h1>Campañas</h1>
        <section className="panel">
          <input placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} />
          <input placeholder="Template" value={template} onChange={e => setTemplate(e.target.value)} />
          <input placeholder="Estado" value={status} onChange={e => setStatus(e.target.value)} />
          <input placeholder="Tags" value={tags} onChange={e => setTags(e.target.value)} />
          <button onClick={createCampaign}>Crear</button>
        </section>
        <section className="panel">
          <input placeholder="ID campaña" value={campaignId} onChange={e => setCampaignId(e.target.value)} />
          <button onClick={sendCampaign}>Enviar campaña</button>
        </section>
      </main>
    </div>
  );
}

function Inbox() {
  const { data: rows, loading } = useFetch(`${API}/inbox?limit=100`, []);
  return (
    <div className="page">
      <Sidebar active="inbox" />
      <main>
        <h1>Inbox</h1>
        {loading ? 'Cargando...' : (
          <table>
            <thead>
              <tr><th>Nombre</th><th>Teléfono</th><th>Fecha</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {(rows || []).map(r => (
                <tr key={r.id}><td>{r.name || ''}</td><td>{r.phone || ''}</td><td>{new Date(r.created_at).toLocaleString()}</td><td>{r.status}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}

function renderPage() {
  const root = document.getElementById('root');
  const path = location.pathname.replace(/\/$/, '');
  const el =
    path === '/users' ? <Users /> :
    path === '/campaigns' ? <Campaigns /> :
    path === '/inbox' ? <Inbox /> :
    <Dashboard />;
  ReactDOM.createRoot(root).render(el);
}

renderPage();
