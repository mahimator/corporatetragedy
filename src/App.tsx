import { useState } from 'react';
import { Activity, ChevronDown, Command, FileText, Folder, MessageCircle, PanelRight, Plus, Search, Settings, Terminal, Video, Image, Bell, LayoutGrid, ArrowLeft, ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';

type AppId = 'whatsapp' | 'instagram' | 'reddit' | 'youtube';
const apps: {id: AppId; name: string; icon: string; status: string}[] = [
  { id: 'whatsapp', name: 'WhatsApp', icon: 'WA', status: 'Connected via web session' },
  { id: 'instagram', name: 'Instagram', icon: 'IG', status: 'Not added yet' },
  { id: 'reddit', name: 'Reddit', icon: 'r/', status: 'Not added yet' },
  { id: 'youtube', name: 'YouTube', icon: 'YT', status: 'Not added yet' },
];

export default function App() {
  const [active, setActive] = useState<AppId>('whatsapp');
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const current = apps.find(a => a.id === active)!;
  const url = active === 'whatsapp' ? 'https://web.whatsapp.com/' : '';

  return <div className="app-frame">
    <header className="titlebar">
      <div className="brand"><span className="brand-mark">W</span><span>WORKBENCH</span><span className="version">0.1</span></div>
      <div className="menubar"><span>File</span><span>Edit</span><span>View</span><span>Navigate</span><span>Window</span><span>Help</span></div>
      <div className="title-center"><Command size={13}/> <span>WhatsApp Workbench</span></div>
      <div className="title-actions"><button title="Notifications"><Bell size={15}/></button><button title="Settings"><Settings size={15}/></button></div>
    </header>
    <div className="toolbar">
      <button className="icon-btn"><ArrowLeft size={14}/></button><button className="icon-btn"><ArrowRight size={14}/></button>
      <button className="icon-btn" onClick={() => setLoaded(false)}><RefreshCw size={14}/></button>
      <div className="crumb"><span>workspace</span><span className="slash">/</span><strong>{current.name.toLowerCase()}</strong></div>
      <div className="toolbar-spacer"/>
      <button className="icon-btn" onClick={() => setInspectorOpen(v=>!v)} title="Toggle inspector"><PanelRight size={14}/></button>
    </div>
    <div className="layout">
      <aside className="activity">
        <button className="activity-item active" title="Explorer"><LayoutGrid size={19}/></button>
        <button className="activity-item" title="Search"><Search size={19}/></button>
        <button className="activity-item" title="Saved"><FileText size={19}/></button>
        <div className="activity-bottom"><button className="activity-item" title="Settings"><Settings size={19}/></button></div>
      </aside>
      <aside className="explorer">
        <div className="explorer-head">EXPLORER <button><Plus size={14}/></button></div>
        <div className="tree-heading"><ChevronDown size={13}/> LEISURE</div>
        <div className="tree">
          {apps.map(app => <button key={app.id} className={active === app.id ? 'tree-item selected' : 'tree-item'} onClick={() => {setActive(app.id); setLoaded(false);}}>
            <span className={'app-icon '+app.id}>{app.icon}</span><span>{app.name}</span>
          </button>)}
        </div>
        <div className="tree-heading second"><ChevronDown size={13}/> COLLECTIONS</div>
        <button className="tree-item muted"><Folder size={14}/> Saved items</button>
        <button className="tree-item muted"><Activity size={14}/> History</button>
        <div className="explorer-foot"><span className="green-dot"/><span>{current.status}</span></div>
      </aside>
      <main className="center">
        <div className="tabs">
          <div className="tab active"><MessageCircle size={14}/><span>{current.name}</span><span className="tab-x">×</span></div>
          <button className="tab-add"><Plus size={14}/></button>
          <div className="tab-fill"/>
          <button className="tab-action" onClick={() => setTerminalOpen(v=>!v)}><Terminal size={14}/></button>
        </div>
        <div className="web-area">
          {active === 'whatsapp' ? <webview key="wa" src={url} partition="persist:whatsapp" allowpopups className="wa-webview" onLoad={() => setLoaded(true)} /> :
          <div className="empty-integration"><div className="empty-icon">{current.icon}</div><h2>{current.name}</h2><p>This integration will be added in a future iteration.</p><button onClick={() => setActive('whatsapp')}>Return to WhatsApp</button></div>}
          {!loaded && active === 'whatsapp' && <div className="loading-overlay"><div className="loader"/><span>Starting WhatsApp Web…</span><small>First launch may require QR authentication</small></div>}
        </div>
        {terminalOpen && <section className="terminal">
          <div className="terminal-tabs"><span className="terminal-tab active"><Terminal size={13}/> TERMINAL</span><span className="terminal-tab">OUTPUT</span><span className="terminal-tab">DEBUG CONSOLE</span><div className="term-fill"/><button onClick={() => setTerminalOpen(false)}>×</button></div>
          <div className="terminal-body"><div><span className="term-prompt">workbench</span><span className="term-muted"> $ </span><span>session --app {active}</span></div><div className="term-muted">Embedded browser session active. Chat rendering experiments will begin in the next iteration.</div><div><span className="term-prompt">workbench</span><span className="term-muted"> $ </span><span className="cursor">▌</span></div></div>
        </section>}
        <footer className="statusbar"><span><Activity size={12}/> Iteration 01</span><span>WhatsApp Web</span><span className="status-spacer"/><span>Workbench Shell</span><span>UTF-8</span></footer>
      </main>
      {inspectorOpen && <aside className="inspector"><div className="inspector-title">INSPECTOR <button onClick={() => setInspectorOpen(false)}>×</button></div><div className="inspect-section"><div className="inspect-heading">SESSION</div><div className="inspect-row"><span>Application</span><strong>{current.name}</strong></div><div className="inspect-row"><span>Partition</span><strong>Persistent</strong></div><div className="inspect-row"><span>State</span><strong className="state-live">● Web session</strong></div></div><div className="inspect-section"><div className="inspect-heading">MEDIA PREVIEW</div><div className="media-placeholder"><Image size={20}/><span>Media inspector</span><small>Iteration 03</small></div></div><div className="inspect-section"><div className="inspect-heading">UPCOMING</div><div className="upcoming"><Video size={14}/> Video & image extraction</div><div className="upcoming"><MessageCircle size={14}/> Terminal chat rendering</div></div></aside>}
    </div>
  </div>;
}