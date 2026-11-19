import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Plus, MessageCircle, Search, Settings, PanelLeft, ExternalLink, Terminal, X, AlertTriangle } from 'lucide-react';

type Chat = { name: string; preview: string; index: number };
type Message = { text: string; outgoing: boolean };

export default function App() {
  const webview = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [address, setAddress] = useState('https://web.whatsapp.com/');
  const [sidebar, setSidebar] = useState(true);
  const [terminalMode, setTerminalMode] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChat, setActiveChat] = useState('');
  const [loadError, setLoadError] = useState('');
  const [pageTitle, setPageTitle] = useState('WhatsApp');

  const go = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    setAddress(url); setLoaded(false); setLoadError('');
    webview.current?.loadURL(url);
  };

  const scanChats = async () => {
    if (!webview.current || !loaded) return;
    try {
      const rows = await webview.current.executeJavaScript(`(() => {
        const els = Array.from(document.querySelectorAll('[data-testid="cell-frame-container"]'));
        return els.map((el, index) => {
          const txt = (el.innerText || '').split('\\n').map(s => s.trim()).filter(Boolean);
          const name = el.querySelector('[title]')?.getAttribute('title') || txt[0] || 'Chat '+(index+1);
          return { name, preview: txt.slice(1,3).join(' · '), index };
        });
      })()`);
      if (Array.isArray(rows)) setChats(rows);
    } catch {}
  };

  const openChat = async (chat: Chat) => {
    try {
      await webview.current.executeJavaScript(`document.querySelectorAll('[data-testid="cell-frame-container"]')[${chat.index}]?.click()`);
      setActiveChat(chat.name);
      setTimeout(scanMessages, 450);
    } catch {}
  };

  const scanMessages = async () => {
    try {
      const result = await webview.current.executeJavaScript(`(() => {
        const nodes = Array.from(document.querySelectorAll('[data-testid="msg-container"]'));
        return nodes.slice(-80).map(n => ({ text: n.innerText || '', outgoing: !!n.querySelector('[data-testid="msg-out"]') || n.className.toString().includes('out') })).filter(m => m.text.trim());
      })()`);
      if (Array.isArray(result)) setMessages(result);
    } catch {}
  };

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setInterval(() => { scanChats(); if (terminalMode && activeChat) scanMessages(); }, 1800);
    return () => window.clearInterval(timer);
  }, [loaded, terminalMode, activeChat]);

  return <div className="browser">
    <header className="windowbar">
      <div className="brand"><span className="brand-glyph">CT</span><span>corporate tragedy</span></div>
      <div className="window-title">{pageTitle} <span className="title-dot">●</span> Work environment</div>
      <div className="window-actions"><button title="Preferences"><Settings size={14}/></button></div>
    </header>
    <div className="browserbar">
      <button className="navbtn" title="Back" onClick={() => webview.current?.goBack()}><ArrowLeft size={15}/></button>
      <button className="navbtn" title="Forward" onClick={() => webview.current?.goForward()}><ArrowRight size={15}/></button>
      <button className="navbtn" title="Reload" onClick={() => {setLoaded(false);setLoadError('');webview.current?.reload();}}><RefreshCw size={14}/></button>
      <form className="address" onSubmit={e => {e.preventDefault();go(address);}}>
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
        <div className="content-heading"><div className="crumb"><span>workspace</span><span className="sep">/</span><b>whatsapp</b></div><div className="heading-tools"><button className={terminalMode?'modebtn active':'modebtn'} onClick={()=>{setTerminalMode(v=>!v);if(!terminalMode)scanChats();}}><Terminal size={13}/> Chat Terminal</button><span className="connection"><i/> SESSION</span></div></div>
        <div className="webview-wrap">
          <webview ref={webview} src="https://web.whatsapp.com/" partition="persist:whatsapp" useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" allowpopups className="webview"
            onDomReady={() => {setLoaded(true);setLoadError('');scanChats();}}
            onDidFailLoad={(e:any) => {if(e.errorCode !== -3) setLoadError(e.errorDescription || 'WhatsApp failed to load');}}
            onConsoleMessage={(e:any)=>console.warn('[WhatsApp guest console]',e.message)}
            onTitleUpdated={(e:any)=>setPageTitle(e.title || 'WhatsApp')}/>
          {!loaded && <div className="loadscreen"><div className="loadmark"><MessageCircle size={28}/></div><div className="loading-title">Opening WhatsApp</div><div className="loading-sub">{loadError || 'QR login should appear here. First launch may ask you to scan it.'}</div>{loadError && <div className="error-hint"><AlertTriangle size={13}/> Webview load error</div>}<div className="loading-track"><div/></div></div>}
          {terminalMode && <section className="terminal-layer">
            <header><span><Terminal size={13}/> WHATSAPP TERMINAL</span><button onClick={()=>setTerminalMode(false)} title="Close terminal view"><X size={14}/></button></header>
            <div className="terminal-columns">
              <aside className="terminal-chatlist"><div className="terminal-caption">CHATS ({chats.length})</div>{chats.map(chat=><button key={chat.index} className={activeChat===chat.name?'selected':''} onClick={()=>openChat(chat)}><strong>{chat.name}</strong><small>{chat.preview || 'No preview available'}</small></button>)}{!chats.length&&<p className="empty-term">Waiting for WhatsApp chat list…</p>}</aside>
              <main className="terminal-messages"><div className="terminal-caption">{activeChat ? 'CONVERSATION / '+activeChat : 'SELECT A CHAT'}</div>{messages.map((m,i)=><div key={i} className={m.outgoing?'message outgoing':'message'}><span className="message-prefix">{m.outgoing?'me':'them'}&gt;</span>{m.text}</div>)}{!activeChat&&<div className="empty-term">Choose a conversation to preview its messages here.<br/>This is an early DOM-reading prototype. WhatsApp remains active underneath.</div>}</main>
            </div>
            <footer><span className="term-green">ct@workspace</span>:<span className="term-blue">whatsapp</span>$ <span className="term-cursor">▋</span><span className="term-note">Read-only preview · messages are not sent from this panel yet</span></footer>
          </section>}
        </div>
        <footer className="status"><span><i/> WhatsApp session</span><span className="status-fill"/><span>Corporate Tragedy</span><span>Iteration 01</span></footer>
      </main>
    </div>
  </div>;
}
