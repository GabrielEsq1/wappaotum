const API = (typeof location !== 'undefined') ? `${location.origin}/api` : 'http://localhost:3000';
const h = React.createElement;

function useFetch(url, deps = []) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(j => { if (mounted) { setData(j); setLoading(false); } })
      .catch(e => { if (mounted) { setError(e); setLoading(false); } });
    return () => { mounted = false; };
  }, deps);
  return { data, loading, error };
}

function Sidebar(props) {
  const active = props.active;
  return h('nav', { className: 'sidebar' }, [
    h('a', { href: '/dashboard', className: active === 'dashboard' ? 'active' : '' }, 'Dashboard'),
    h('a', { href: '/users', className: active === 'users' ? 'active' : '' }, 'Usuarios'),
    h('a', { href: '/campaigns', className: active === 'campaigns' ? 'active' : '' }, 'Campañas'),
    h('a', { href: '/inbox', className: active === 'inbox' ? 'active' : '' }, 'Inbox')
  ]);
}

function Card(props) {
  return h('div', { className: 'card' }, [
    h('div', { className: 'label' }, props.label),
    h('div', { className: 'value' }, props.value ?? 0)
  ]);
}

function Dashboard() {
  const { data } = useFetch(`${API}/stats`, []);
  return h('div', { className: 'page' }, [
    h(Sidebar, { active: 'dashboard' }),
    h('main', null, [
      h('h1', null, 'Dashboard'),
      h('div', { className: 'cards' }, [
        h(Card, { label: 'Total contactos', value: data?.users }),
        h(Card, { label: 'Campañas activas', value: data?.active_campaigns }),
        h(Card, { label: 'Conversaciones abiertas', value: data?.open_conversations })
      ])
    ])
  ]);
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

  const tableRows = (users || []).map(u => h('tr', { key: u.id }, [
    h('td', null, u.name),
    h('td', null, u.phone),
    h('td', null, u.optin ? 'opt-in' : 'opt-out'),
    h('td', null, u.tags || ''),
    h('td', null, u.status || '')
  ]));

  return h('div', { className: 'page' }, [
    h(Sidebar, { active: 'users' }),
    h('main', null, [
      h('h1', null, 'Usuarios'),
      h('section', { className: 'panel' }, [
        h('h2', null, 'Importar JSON'),
        h('textarea', { rows: 8, value: jsonText, onChange: e => setJsonText(e.target.value), placeholder: '[{"name":"Juan","phone":"57300...","optin":true,"tags":"vip","status":"registered"}]' }),
        h('button', { onClick: importJSON }, 'Importar JSON')
      ]),
      h('section', { className: 'panel' }, [
        h('h2', null, 'Importar CSV'),
        h('input', { type: 'file', accept: '.csv', onChange: e => setCsvFile(e.target.files?.[0] || null) }),
        h('small', null, 'Cabeceras: name,phone,email,optin,tags,status'),
        h('button', { onClick: importCSV }, 'Importar CSV')
      ]),
      h('section', { className: 'panel' }, [
        h('h2', null, 'Lista'),
        loading ? 'Cargando...' : h('table', null, [
          h('thead', null, h('tr', null, [h('th', null, 'Nombre'), h('th', null, 'Teléfono'), h('th', null, 'Opt-in'), h('th', null, 'Tags'), h('th', null, 'Estado')])),
          h('tbody', null, tableRows)
        ])
      ])
    ])
  ]);
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

  return h('div', { className: 'page' }, [
    h(Sidebar, { active: 'campaigns' }),
    h('main', null, [
      h('h1', null, 'Campañas'),
      h('section', { className: 'panel' }, [
        h('input', { placeholder: 'Nombre', value: name, onChange: e => setName(e.target.value) }),
        h('input', { placeholder: 'Template', value: template, onChange: e => setTemplate(e.target.value) }),
        h('input', { placeholder: 'Estado', value: status, onChange: e => setStatus(e.target.value) }),
        h('input', { placeholder: 'Tags', value: tags, onChange: e => setTags(e.target.value) }),
        h('button', { onClick: createCampaign }, 'Crear')
      ]),
      h('section', { className: 'panel' }, [
        h('input', { placeholder: 'ID campaña', value: campaignId, onChange: e => setCampaignId(e.target.value) }),
        h('button', { onClick: sendCampaign }, 'Enviar campaña')
      ])
    ])
  ]);
}

function Inbox() {
  const { data: rows, loading } = useFetch(`${API}/inbox?limit=100`, []);
  const table = (rows || []).map(r => h('tr', { key: r.id }, [
    h('td', null, r.name || ''),
    h('td', null, r.phone || ''),
    h('td', null, new Date(r.created_at).toLocaleString()),
    h('td', null, r.status)
  ]));
  return h('div', { className: 'page' }, [
    h(Sidebar, { active: 'inbox' }),
    h('main', null, [
      h('h1', null, 'Inbox'),
      loading ? 'Cargando...' : h('table', null, [
        h('thead', null, h('tr', null, [h('th', null, 'Nombre'), h('th', null, 'Teléfono'), h('th', null, 'Fecha'), h('th', null, 'Estado')])),
        h('tbody', null, table)
      ])
    ])
  ]);
}

function renderPage() {
  const root = document.getElementById('root');
  const path = location.pathname.replace(/\/$/, '');
  const component = path === '/users' ? Users : path === '/campaigns' ? Campaigns : path === '/inbox' ? Inbox : Dashboard;
  ReactDOM.createRoot(root).render(h(component));
}

renderPage();
