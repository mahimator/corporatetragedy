import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Plus, MessageCircle, PanelLeft, ExternalLink, Terminal, X, AlertTriangle, ShieldCheck } from 'lucide-react';

type Chat = { name: string; preview: string; index: number };
type Message = { text: string; outgoing: boolean };

const HOME_URL = 'https://web.whatsapp.com/';
const isWhatsAppURL = (value: string) => {
  try { return (() => { const host = new URL(value).hostname; return host === 'whatsapp.com' || host.endsWith('.whatsapp.com'); })(); } catch { return false; }
};


const normalizeUrl = (input: string) => {
  const value = input.trim();
  if (!value) return null;

  // Explicit URLs and host-like inputs navigate directly. Plain language becomes a search.
  const hasProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value);
  const looksLikeHost = !/\s/.test(value) && (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(value) || /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/i.test(value));
  if (!hasProtocol && !looksLikeHost) return `https://duckduckgo.com/?q=${encodeURIComponent(value)}`;

  const candidate = hasProtocol ? value : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
};

export default function App() {
  const webview = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [address, setAddress] = useState(HOME_URL);
  const [sidebar, setSidebar] = useState(true);
  const [terminalMode, setTerminalMode] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChat, setActiveChat] = useState('');
  const [loadError, setLoadError] = useState('');
  const [pageTitle, setPageTitle] = useState('WhatsApp');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const isWhatsApp = (() => {
    try { return isWhatsAppURL(address); }
    catch { return false; }
  })();

  const clearWorkspace = () => {
    setChats([]);
    setMessages([]);
    setActiveChat('');
    setTerminalMode(false);
  };

  const go = (value: string) => {
    const url = normalizeUrl(value);
    if (!url) {
      setLoadError('Enter a valid web address using HTTP or HTTPS.');
      return;
    }
    setAddress(url);
    setLoaded(false);
    setLoadError('');
    clearWorkspace();
    webview.current?.loadURL(url);
  };

  const scanChats = async () => {
    if (!webview.current || !loaded || !isWhatsApp) return;
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
    } catch {
      // WhatsApp may change its DOM at any time. Keep the last successful scan.
    }
  };

  const openChat = async (chat: Chat) => {
    if (!webview.current || !isWhatsApp) return;
    try {
      await webview.current.executeJavaScript(`document.querySelectorAll('[data-testid="cell-frame-container"]')[${Number(chat.index)}]?.click()`);
      setActiveChat(chat.name);
      setMessages([]);
      window.setTimeout(() => void scanMessages(), 500);
    } catch {
      setLoadError('Could not open this conversation preview.');
    }
  };

  const scanMessages = async () => {
    if (!webview.current || !loaded || !isWhatsApp) return;
    try {
      const result = await webview.current.executeJavaScript(`(() => {
        const nodes = Array.from(document.querySelectorAll('[data-testid="msg-container"]'));
        return nodes.slice(-80).map(n => ({
          text: n.innerText || '',
          outgoing: !!n.querySelector('[data-testid="msg-out"]') || n.className.toString().includes('out')
        })).filter(m => m.text.trim());
      })()`);
      if (Array.isArray(result)) setMessages(result);
    } catch {
      // A message scan is best-effort, never interrupt the active page.
    }
  };

  useEffect(() => {
    if (!loaded || !isWhatsApp) return;
    const timer = window.setInterval(() => {
      void scanChats();
      if (terminalMode && activeChat) void scanMessages();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [loaded, isWhatsApp, terminalMode, activeChat]);

  useEffect(() => {
    const view = webview.current;
    if (!view) return;
    const handleNavigation = (event: any) => {
      if (!event.url) return;
      setAddress(event.url);
      setLoadError('');
      if (!isWhatsAppURL(event.url)) clearWorkspace();
      refreshNavigation();
    };
    const handleStart = () => setLoaded(false);
    const handleStop = () => { setLoaded(true); refreshNavigation(); };
    view.addEventListener('did-navigate', handleNavigation);
    view.addEventListener('did-navigate-in-page', handleNavigation);
    view.addEventListener('did-start-loading', handleStart);
    view.addEventListener('did-stop-loading', handleStop);
    return () => {
      view.removeEventListener('did-navigate', handleNavigation);
      view.removeEventListener('did-navigate-in-page', handleNavigation);
      view.removeEventListener('did-start-loading', handleStart);
      view.removeEventListener('did-stop-loading', handleStop);
    };
  }, []);


  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        const input = document.querySelector<HTMLInputElement>('.address input');
        input?.focus();
        input?.select();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        setLoaded(false);
        setLoadError('');
        webview.current?.reload();
      }
      if ((event.altKey || event.metaKey) && event.key === 'ArrowLeft' && canGoBack) {
        event.preventDefault();
        webview.current?.goBack();
      }
      if ((event.altKey || event.metaKey) && event.key === 'ArrowRight' && canGoForward) {
        event.preventDefault();
        webview.current?.goForward();
      }
      if (event.key === 'Escape' && terminalMode) {
        setTerminalMode(false);
      }

    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [canGoBack, canGoForward, terminalMode]);;

  const refreshNavigation = () => {
    setCanGoBack(!!webview.current?.canGoBack?.());
    setCanGoForward(!!webview.current?.canGoForward?.());
  };

  return <div className="browser">
    <header className="windowbar">
      <div className="brand"><span className="brand-glyph">CT</span><span>corporate tragedy</span></div>
      <div className="window-title">{pageTitle} <span className="title-dot">●</span> Work environment</div>
      <div className="window-actions" aria-hidden="true"></div>
    </header>
    <div className="browserbar">
      <button className="navbtn" title="Back" disabled={!canGoBack} onClick={() => webview.current?.goBack()}><ArrowLeft size={15}/></button>
      <button className="navbtn" title="Forward" disabled={!canGoForward} onClick={() => webview.current?.goForward()}><ArrowRight size={15}/></button>
      <button className="navbtn" title="Reload" onClick={() => {setLoaded(false);setLoadError('');webview.current?.reload();}}><RefreshCw size={14}/></button>
      <form className="address" onSubmit={e => {e.preventDefault();go(address);}}>
        <span className="secure"><ShieldCheck size={12}/></span><input value={address} onChange={e=>setAddress(e.target.value)} aria-label="Address" spellCheck={false}/>
        <button type="submit" title="Go"><ArrowRight size={13}/></button>
      </form>
      {loaded && loadError && <span className="address-error" role="alert">{loadError}</span>}
      <button className="navbtn" title="Open in external browser" onClick={() => {const url=normalizeUrl(address);if(url)window.open(url, '_blank')}}><ExternalLink size={14}/></button>
      <button className="navbtn" title="Toggle sidebar" onClick={() => setSidebar(v=>!v)}><PanelLeft size={14}/></button>
    </div>
    <div className="tabstrip">
      <div className="tab active"><MessageCircle size={14}/><span>{isWhatsApp ? 'WhatsApp' : pageTitle || 'Web'}</span></div>
      <button className="addtab" title="Additional tabs are not available yet" disabled><Plus size={14}/></button>
      <div className="tabspace"/>
    </div>
    <div className="workspace">
      {sidebar && <aside className="side">
        <div className="side-label">WORKSPACE</div>
        <div className="side-group"><span className="chevron">⌄</span> APPS</div>
        <button className="app-row active" onClick={() => go(HOME_URL)}><span className="wa-icon">W</span> WhatsApp <span className="live">●</span></button>
        <button className="app-row disabled" disabled title="More integrations will be added later"><span className="add-icon">+</span> Add integration</button>
        
      </aside>}
      <main className="content">
        <div className="content-heading"><div className="crumb"><span>workspace</span><span className="sep">/</span><b>{isWhatsApp ? 'whatsapp' : 'web'}</b></div><div className="heading-tools"><button className={terminalMode?'modebtn active':'modebtn'} disabled={!isWhatsApp || !loaded} onClick={()=>{setTerminalMode(v=>!v);if(!terminalMode)void scanChats();}}><Terminal size={13}/> Chat Terminal</button><span className="connection"><i className={loaded?'connected':'connecting'}/>{loaded ? ' SESSION' : ' CONNECTING'}</span></div></div>
        <div className="webview-wrap">
          <webview ref={webview} src={HOME_URL} partition="persist:whatsapp" useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" allowpopups className="webview"
            onDomReady={() => {setLoaded(true);setLoadError('');refreshNavigation();void scanChats();}}            onDidFailLoad={(e:any) => {if(e.errorCode !== -3) setLoadError(e.errorDescription || 'Page failed to load');}}
            onConsoleMessage={(e:any)=>console.warn('[webview console]',e.message)}
            onTitleUpdated={(e:any)=>setPageTitle(e.title || 'Web')}/>
          {!loaded && <div className="loadscreen"><div className="loadmark"><MessageCircle size={28}/></div><div className="loading-title">{isWhatsApp ? 'Opening WhatsApp' : 'Loading workspace'}</div><div className="loading-sub">{loadError || (isWhatsApp ? 'QR login should appear here. First launch may ask you to scan it.' : 'Waiting for the page to finish loading…')}</div>{loadError && <div className="error-hint"><AlertTriangle size={13}/> Navigation error</div>}<div className="loading-track"><div/></div></div>}
          {terminalMode && isWhatsApp && <section className="terminal-layer">
            <header><span><Terminal size={13}/> WHATSAPP TERMINAL</span><button onClick={()=>setTerminalMode(false)} title="Close terminal view"><X size={14}/></button></header>
            <div className="terminal-columns">
              <aside className="terminal-chatlist"><div className="terminal-caption">CHATS ({chats.length})</div>{chats.map(chat=><button key={chat.index} className={activeChat===chat.name?'selected':''} onClick={()=>openChat(chat)}><strong>{chat.name}</strong><small>{chat.preview || 'No preview available'}</small></button>)}{!chats.length&&<p className="empty-term">Waiting for WhatsApp chat list…</p>}</aside>
              <main className="terminal-messages"><div className="terminal-caption">{activeChat ? 'CONVERSATION / '+activeChat : 'SELECT A CHAT'}</div>{messages.map((m,i)=><div key={i} className={m.outgoing?'message outgoing':'message'}><span className="message-prefix">{m.outgoing?'me':'them'}&gt;</span>{m.text}</div>)}{!activeChat&&<div className="empty-term">Choose a conversation to preview its messages here.<br/>This is an early DOM-reading prototype. WhatsApp remains active underneath.</div>}</main>
            </div>
            <footer><span className="term-green">ct@workspace</span>:<span className="term-blue">whatsapp</span>$ <span className="term-cursor">▋</span><span className="term-note">Read-only preview · messages are not sent from this panel yet</span></footer>
          </section>}
        </div>
        <footer className="status"><span><i/> {loaded ? (isWhatsApp ? 'WhatsApp session' : 'Page session') : 'Connecting'}</span><span className="status-fill"/><span>Corporate Tragedy</span><span>Local beta</span></footer>
      </main>
    </div>
  </div>;
}
