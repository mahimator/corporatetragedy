import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Plus, MessageCircle, PanelLeft, ExternalLink, Terminal, X, AlertTriangle, ShieldCheck, Bookmark } from 'lucide-react';

type Chat = { name: string; preview: string; index: number };
type Message = { text: string; outgoing: boolean };
type Bookmark = { title: string; url: string };
type BrowserTab = { id: number; url: string; title: string; loaded: boolean; error: string; canGoBack: boolean; canGoForward: boolean };

const HOME_URL = 'https://web.whatsapp.com/';
const NEW_TAB_URL = 'https://duckduckgo.com/';
const isWhatsAppURL = (value: string) => {
  try { const host = new URL(value).hostname; return host === 'whatsapp.com' || host.endsWith('.whatsapp.com'); }
  catch { return false; }
};

const normalizeUrl = (input: string) => {
  const value = input.trim();
  if (!value) return null;
  const hasProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value);
  const looksLikeHost = !/\s/.test(value) && (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(value) || /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/i.test(value));
  if (!hasProtocol && !looksLikeHost) return `https://duckduckgo.com/?q=${encodeURIComponent(value)}`;
  const candidate = hasProtocol ? value : `https://${value}`;
  try { const parsed = new URL(candidate); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null; }
  catch { return null; }
};

export default function App() {
  const webviews = useRef<Record<number, any>>({});
  const nextTabId = useRef(2);
  const [tabs, setTabs] = useState<BrowserTab[]>([{ id: 1, url: HOME_URL, title: 'WhatsApp', loaded: false, error: '', canGoBack: false, canGoForward: false }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const activeTab = tabs.find(tab => tab.id === activeTabId) ?? tabs[0];
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
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem('ct-bookmarks') || '[]'); return Array.isArray(saved) ? saved.filter((b:any) => typeof b?.title === 'string' && typeof b?.url === 'string') : []; }
    catch { return []; }
  });
  const isWhatsApp = isWhatsAppURL(address);
  const isBookmarked = bookmarks.some(bookmark => bookmark.url === address);
  const getWebview = (id = activeTabId) => webviews.current[id];
  const updateTab = (id: number, patch: Partial<BrowserTab>) => setTabs(list => list.map(tab => tab.id === id ? { ...tab, ...patch } : tab));

  useEffect(() => { localStorage.setItem('ct-bookmarks', JSON.stringify(bookmarks)); }, [bookmarks]);

  const clearWorkspace = () => { setChats([]); setMessages([]); setActiveChat(''); setTerminalMode(false); };
  const go = (value: string) => {
    const url = normalizeUrl(value);
    if (!url) { setLoadError('Enter a valid web address using HTTP or HTTPS.'); return; }
    setAddress(url); setLoaded(false); setLoadError(''); updateTab(activeTabId, { url, loaded: false, error: '' }); clearWorkspace();
  };
  const refreshNavigation = (id = activeTabId) => {
    const view = getWebview(id);
    const back = !!view?.canGoBack?.(); const forward = !!view?.canGoForward?.();
    updateTab(id, { canGoBack: back, canGoForward: forward });
    if (id === activeTabId) { setCanGoBack(back); setCanGoForward(forward); }
  };
  const switchTab = (id: number) => {
    const tab = tabs.find(t => t.id === id); if (!tab) return;
    setActiveTabId(id); setAddress(tab.url); setLoaded(tab.loaded); setLoadError(tab.error); setPageTitle(tab.title);
    setCanGoBack(tab.canGoBack); setCanGoForward(tab.canGoForward); clearWorkspace();
    const view = getWebview(id); if (view) { setAddress(view.getURL?.() || tab.url); refreshNavigation(id); }
  };
  const addTab = () => {
    const id = nextTabId.current++; const url = NEW_TAB_URL;
    const tab: BrowserTab = { id, url, title: 'Search', loaded: false, error: '', canGoBack: false, canGoForward: false };
    setTabs(list => [...list, tab]); setActiveTabId(id); setAddress(url); setLoaded(false); setLoadError(''); setPageTitle('Search'); setCanGoBack(false); setCanGoForward(false); clearWorkspace();
  };
  const closeTab = (id: number) => {
    if (tabs.length <= 1) { if (id === activeTabId) go(HOME_URL); return; }
    const index = tabs.findIndex(t => t.id === id); const remaining = tabs.filter(t => t.id !== id);
    const wasActive = id === activeTabId; setTabs(remaining);
    delete webviews.current[id];
    if (wasActive) { const next = remaining[Math.max(0, index - 1)] ?? remaining[0]; setActiveTabId(next.id); setAddress(next.url); setLoaded(next.loaded); setLoadError(next.error); setPageTitle(next.title); setCanGoBack(next.canGoBack); setCanGoForward(next.canGoForward); clearWorkspace(); }
  };
  const toggleBookmark = () => {
    const url = normalizeUrl(address); if (!url) return;
    if (bookmarks.some(bookmark => bookmark.url === url)) setBookmarks(list => list.filter(bookmark => bookmark.url !== url));
    else setBookmarks(list => [...list, { title: isWhatsApp ? 'WhatsApp' : (pageTitle !== 'WhatsApp' ? pageTitle : new URL(url).hostname), url }]);
  };

  const scanChats = async () => {
    const view = getWebview();
    if (!view || !loaded || !isWhatsApp) return;
    try {
      const rows = await view.executeJavaScript(`(() => {
        const els = Array.from(document.querySelectorAll('[data-testid="cell-frame-container"]'));
        return els.map((el, index) => {
          const txt = (el.innerText || '').split('\\n').map(s => s.trim()).filter(Boolean);
          const name = el.querySelector('[title]')?.getAttribute('title') || txt[0] || 'Chat '+(index+1);
          return { name, preview: txt.slice(1,3).join(' · '), index };
        });
      })()`);
      if (Array.isArray(rows)) setChats(rows);
    } catch { /* WhatsApp DOM may change */ }
  };
  const openChat = async (chat: Chat) => {
    const view = getWebview(); if (!view || !isWhatsApp) return;
    try {
      await view.executeJavaScript(`document.querySelectorAll('[data-testid="cell-frame-container"]')[${Number(chat.index)}]?.click()`);
      setActiveChat(chat.name); setMessages([]); window.setTimeout(() => void scanMessages(), 500);
    } catch { setLoadError('Could not open this conversation preview.'); }
  };
  const scanMessages = async () => {
    const view = getWebview(); if (!view || !loaded || !isWhatsApp) return;
    try {
      const result = await view.executeJavaScript(`(() => {
        const nodes = Array.from(document.querySelectorAll('[data-testid="msg-container"]'));
        return nodes.slice(-80).map(n => ({ text: n.innerText || '', outgoing: !!n.querySelector('[data-testid="msg-out"]') || n.className.toString().includes('out') })).filter(m => m.text.trim());
      })()`);
      if (Array.isArray(result)) setMessages(result);
    } catch { /* read-only best effort */ }
  };

  useEffect(() => {
    if (!loaded || !isWhatsApp) return;
    const timer = window.setInterval(() => { void scanChats(); if (terminalMode && activeChat) void scanMessages(); }, 2500);
    return () => window.clearInterval(timer);
  }, [loaded, isWhatsApp, terminalMode, activeChat, activeTabId]);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    tabs.forEach(tab => {
      const view = getWebview(tab.id); if (!view) return;
      const handleNavigation = (event: any) => {
        if (!event.url) return;
        updateTab(tab.id, { url: event.url, error: '' });
        if (tab.id === activeTabId) { setAddress(event.url); setLoadError(''); if (!isWhatsAppURL(event.url)) clearWorkspace(); refreshNavigation(tab.id); }
      };
      const handleStart = () => { updateTab(tab.id, { loaded: false }); if (tab.id === activeTabId) setLoaded(false); };
      const handleStop = () => { updateTab(tab.id, { loaded: true }); if (tab.id === activeTabId) { setLoaded(true); refreshNavigation(tab.id); } };
      const handleReady = () => { const title = view.getTitle?.() || tab.title; updateTab(tab.id, { loaded: true, title }); if (tab.id === activeTabId) { setLoaded(true); setPageTitle(title); setLoadError(''); refreshNavigation(tab.id); void scanChats(); } };
      const handleFailure = (event: any) => { if (event.errorCode === -3) return; const error = event.errorDescription || 'Page failed to load'; updateTab(tab.id, { loaded: false, error }); if (tab.id === activeTabId) { setLoaded(false); setLoadError(error); } };
      const handleTitle = (event: any) => { const title = event.title || tab.title; updateTab(tab.id, { title }); if (tab.id === activeTabId) setPageTitle(title); };
      view.addEventListener('did-navigate', handleNavigation); view.addEventListener('did-navigate-in-page', handleNavigation); view.addEventListener('did-start-loading', handleStart); view.addEventListener('did-stop-loading', handleStop); view.addEventListener('dom-ready', handleReady); view.addEventListener('did-fail-load', handleFailure); view.addEventListener('page-title-updated', handleTitle);
      cleanups.push(() => { view.removeEventListener('did-navigate', handleNavigation); view.removeEventListener('did-navigate-in-page', handleNavigation); view.removeEventListener('did-start-loading', handleStart); view.removeEventListener('did-stop-loading', handleStop); view.removeEventListener('dom-ready', handleReady); view.removeEventListener('did-fail-load', handleFailure); view.removeEventListener('page-title-updated', handleTitle); });
    });
    return () => cleanups.forEach(cleanup => cleanup());
  }, [tabs.map(tab => tab.id).join(','), activeTabId]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'l') { event.preventDefault(); const input = document.querySelector<HTMLInputElement>('.address input'); input?.focus(); input?.select(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'r') { event.preventDefault(); setLoaded(false); setLoadError(''); getWebview()?.reload(); }
      if ((event.altKey || event.metaKey) && event.key === 'ArrowLeft' && canGoBack) { event.preventDefault(); getWebview()?.goBack(); }
      if ((event.altKey || event.metaKey) && event.key === 'ArrowRight' && canGoForward) { event.preventDefault(); getWebview()?.goForward(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 't') { event.preventDefault(); addTab(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'w') { event.preventDefault(); closeTab(activeTabId); }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Tab') { event.preventDefault(); const idx = tabs.findIndex(t => t.id === activeTabId); switchTab(tabs[(idx + (event.shiftKey ? -1 : 1) + tabs.length) % tabs.length].id); }
      if (event.key === 'Escape' && terminalMode) setTerminalMode(false);
    };
    window.addEventListener('keydown', handleShortcut); return () => window.removeEventListener('keydown', handleShortcut);
  }, [canGoBack, canGoForward, terminalMode, tabs, activeTabId]);

  return <div className="browser">
    <header className="windowbar">
      <div className="brand"><span className="brand-glyph">CT</span><span>corporate tragedy</span></div>
      <div className="window-title">{pageTitle} <span className="title-dot">●</span> Work environment</div>
      <div className="window-actions" aria-hidden="true"></div>
    </header>
    <div className="browserbar">
      <button className="navbtn" title="Back" disabled={!canGoBack} onClick={() => getWebview()?.goBack()}><ArrowLeft size={15}/></button>
      <button className="navbtn" title="Forward" disabled={!canGoForward} onClick={() => getWebview()?.goForward()}><ArrowRight size={15}/></button>
      <button className="navbtn" title="Reload" onClick={() => {setLoaded(false);setLoadError('');getWebview()?.reload();}}><RefreshCw size={14}/></button>
      <form className="address" onSubmit={e => {e.preventDefault();go(address);}}>
        <span className="secure"><ShieldCheck size={12}/></span><input value={address} onChange={e=>setAddress(e.target.value)} aria-label="Address" spellCheck={false}/>
        <button type="submit" title="Go"><ArrowRight size={13}/></button>
      </form>
      <button className={isBookmarked ? "navbtn bookmark-active" : "navbtn"} title={isBookmarked ? "Remove bookmark" : "Bookmark page"} onClick={toggleBookmark}><Bookmark size={14}/></button>
      <button className="navbtn" title="Open in external browser" onClick={() => {const url=normalizeUrl(address);if(url)window.open(url, '_blank')}}><ExternalLink size={14}/></button>
      <button className="navbtn" title="Toggle sidebar" onClick={() => setSidebar(v=>!v)}><PanelLeft size={14}/></button>
    </div>
    <div className="tabstrip">
      {tabs.map(tab => <div key={tab.id} className={tab.id === activeTabId ? 'tab active' : 'tab'} onClick={() => switchTab(tab.id)} role="button" tabIndex={0} title={tab.url}>
        {tab.id === 1 ? <MessageCircle size={14}/> : <span className="tab-favicon">◉</span>}
        <span className="tab-title">{tab.title || 'Web'}</span>
        <button className="tab-close" title="Close tab" onClick={event => {event.stopPropagation();closeTab(tab.id);}}><X size={12}/></button>
      </div>)}
      <button className="addtab" title="New tab" onClick={addTab}><Plus size={14}/></button>
      <div className="tabspace"/>
    </div>
    <div className="workspace">
      {sidebar && <aside className="side">
        <div className="side-label">WORKSPACE</div>
        <div className="side-group"><span className="chevron">⌄</span> APPS</div>
        <button className="app-row active" onClick={() => go(HOME_URL)}><span className="wa-icon">W</span> WhatsApp <span className="live">●</span></button>
        <button className="app-row disabled" disabled title="More integrations will be added later"><span className="add-icon">+</span> Add integration</button>
        <div className="side-label bookmark-label">BOOKMARKS ({bookmarks.length})</div>
        {!bookmarks.length && <div className="bookmark-empty">Bookmark pages to pin them here.</div>}
        {bookmarks.map((bookmark,index)=><div className="bookmark-row" key={bookmark.url}><button title={bookmark.url} onClick={()=>go(bookmark.url)}><Bookmark size={12}/><span>{bookmark.title}</span></button><button className="bookmark-remove" title="Remove bookmark" onClick={()=>setBookmarks(list=>list.filter((_,i)=>i!==index))}><X size={12}/></button></div>)}
      </aside>}
      <main className="content">
        <div className="content-heading"><div className="crumb"><span>workspace</span><span className="sep">/</span><b>{isWhatsApp ? 'whatsapp' : 'web'}</b></div><div className="heading-tools"><button className={terminalMode?'modebtn active':'modebtn'} disabled={!isWhatsApp || !loaded} onClick={()=>{setTerminalMode(v=>!v);if(!terminalMode)void scanChats();}}><Terminal size={13}/> Chat Terminal</button><span className="connection"><i className={loaded?'connected':'connecting'}/>{loaded ? ' SESSION' : ' CONNECTING'}</span></div></div>
        <div className="webview-wrap">
          {tabs.map(tab=><webview key={tab.id} ref={(element:any)=>{if(element)webviews.current[tab.id]=element;else delete webviews.current[tab.id];}} src={tab.url} partition="persist:whatsapp" useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" allowpopups className="webview" style={{display:tab.id===activeTabId?'flex':'none'}}/> )}
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
