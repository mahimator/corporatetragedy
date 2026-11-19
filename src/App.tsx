import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Plus, MessageCircle, Search, Settings, PanelLeft, ExternalLink } from 'lucide-react';

export default function App() {
  const webview = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [address, setAddress] = useState('https://web.whatsapp.com/');
  const [sidebar, setSidebar] = useState(true);

  const go = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    setAddress(url);
    setLoaded(false);
    if (webview.current) webview.current.loadURL(url);
  };

  return <div className="browser">
    <header className="windowbar">
      <div className="brand"><span className="brand-glyph">CT</span><span>corporate tragedy</span></div>
      <div className="window-title">WhatsApp <span className="title-dot">●</span> Work environment</div>
      <div className="window-actions"><button title="Preferences"><Settings size={14}/></button></div>
    </header>
    <div className="browserbar">
      <button className="navbtn" title="Back" onClick={() => webview.current?.goBack()}><ArrowLeft size={15}/></button>
      <button className="navbtn" title="Forward" onClick={() => webview.current?.goForward()}><ArrowRight size={15}/></button>
      <button className="navbtn" title="Reload" onClick={() => {setLoaded(false); webview.current?.reload();}}><RefreshCw size={14}/></button>
      <form className="address" onSubmit={e => {e.preventDefault(); go(address);}}>
        <span className="secure">◈</span><input value={address} onChange={e=>setAddress(e.target.value)} aria-label="Address"/>
        <button type="submit" title="Go"><ArrowRight size={13}/></button>
      </form>
      <button className="navbtn" title="Open in external browser" onClick={() => window.open(address, '_blank')}><ExternalLink size={14}/></button>
      <button className="navbtn" title="Toggle sidebar" onClick={() => setSidebar(v=>!v)}><PanelLeft size={14}/></button>
    </div>
    <div className="tabstrip">
      <div className="tab active"><MessageCircle size={14}/><span>WhatsApp</span><span className="tab-close">×</span></div>
      <button className="addtab" title="Add integration (coming later)"><Plus size={14}/></button>
      <div className="tabspace"/>
    </div>
    <div className="workspace">
      {sidebar && <aside className="side">
        <div className="side-label">WORKSPACE</div>
        <div className="side-group"><span className="chevron">⌄</span> APPS</div>
        <div className="app-row active"><span className="wa-icon">W</span> WhatsApp <span className="live">●</span></div>
        <button className="app-row disabled"><span className="add-icon">+</span> Add integration</button>
        <div className="side-bottom"><button><Search size={14}/> Find</button><button><Settings size={14}/> Preferences</button></div>
      </aside>}
      <main className="content">
        <div className="content-heading"><div className="crumb"><span>workspace</span><span className="sep">/</span><b>whatsapp</b></div><div className="heading-tools"><span className="connection"><i/> SESSION ACTIVE</span></div></div>
        <div className="webview-wrap">
          <webview ref={webview} src="https://web.whatsapp.com/" partition="persist:whatsapp" allowpopups className="webview" onLoad={() => setLoaded(true)} />
          {!loaded && <div className="loadscreen"><div className="loadmark"><MessageCircle size={28}/></div><div className="loading-title">Opening WhatsApp</div><div className="loading-sub">First launch may ask you to scan the QR code.</div><div className="loading-track"><div/></div></div>}
        </div>
        <footer className="status"><span><i/> WhatsApp session</span><span className="status-fill"/><span>Corporate Tragedy</span><span>Iteration 01</span></footer>
      </main>
    </div>
  </div>;
}
