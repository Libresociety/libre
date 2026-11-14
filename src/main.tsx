import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { games } from './catalog';
import { complete, execute, themes, type Result, type Theme } from './terminal/commands';
import './style.css';
interface Entry { id: number; command: string; result: Result }
function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [draft, setDraft] = useState('');
  const [theme, setTheme] = useState<Theme>(() => { try { const saved = localStorage.getItem('underground-theme'); return themes.includes(saved as Theme) ? saved as Theme : 'green'; } catch { return 'green'; } });
  const inputRef = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('underground-theme', theme); } catch { /* Storage may be unavailable in private contexts. */ } }, [theme]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'instant', block: 'end' }); }, [entries]);
  const run = (command: string) => {
    if (!command.trim()) return;
    const nextHistory = [...history, command].slice(-100);
    const result = execute(command, { history: nextHistory });
    if (result.launch) {
      const tab = window.open(result.launch.url, '_blank', 'noopener,noreferrer');
      // A safe explicit link is also always rendered, including when popups are blocked.
      void tab;
    }
    if (result.theme) setTheme(result.theme);
    setEntries(prev => result.clear ? [] : [...prev, { id: ++sequence.current, command, result }].slice(-150));
    setHistory(nextHistory); setCursor(nextHistory.length); setInput(''); setDraft(''); inputRef.current?.focus();
  };
  return <div className="app-shell">
    <header className="masthead"><a href="./" aria-label="Underground home" className="brand"><span className="brand-icon">[u_]</span> UNDERGROUND<span className="brand-sub"> / TERMINAL NETWORK</span></a><span className="local-status"><i/> LOCAL MODE <span>v0.1.0</span></span></header>
    <main>
      <div className="intro-label"><span>AN OPEN DOOR TO A SMALLER INTERNET</span><span>EST. 2026</span></div>
      <section className="terminal" aria-label="Interactive terminal">
        <div className="window-bar"><span className="window-dots"><i/><i/><i/></span><span>guest@underground: ~</span><span className="window-right">bash / local</span></div>
        <div className="terminal-body">
          <div className="boot"><span className="muted">UNDERGROUND OS [Version 0.1.0] — local session</span><p><span className="check">✓</span> Loading game index <span className="muted">..................</span> {games.length} entries<br/><span className="check">✓</span> Initializing terminal <span className="muted">..............</span> ready</p></div>
          <div className="welcome"><pre aria-hidden="true">{` _   _ _   _ ____  _____ ____   ____ ____   ___  _   _ _   _ ____
| | | | \\ | |  _ \\| ____|  _ \\ / ___|  _ \\ / _ \\| | | | \\ | |  _ \\
| |_| |  \\| | | | |  _| | |_) | |  _| |_) | | | | | | |  \\| | | | |
|  _  | |\\  | |_| | |___|  _ <| |_| |  _ <| |_| | |_| | |\\  | |_| |
|_| |_|_| \\_|____/|_____|_| \\_\\____|_| \\_\\___/ \\___/|_| \\_|____/`}</pre><h1>Welcome to the underground<span className="block-cursor">_</span></h1><p>A place to play. A place to explore. A little off the beaten path.</p><p className="welcome-help">New here? Type <button onClick={() => run('help')}>help</button> to find your way around.</p></div>
          <div className="session-divider"><span>SESSION STARTED</span><span>GUEST ACCESS · NO SIGN-IN REQUIRED</span></div>
          <div role="log" aria-label="Command output" aria-live="polite" aria-relevant="additions" className="output">{entries.map(entry => <div className="entry" key={entry.id}><div className="echo"><span>guest<span className="muted">@</span>underground<span className="muted">:~$</span></span> {entry.command}</div><div className="result">{entry.result.lines.map((line,i) => <div key={i} className="output-line">{line || '\u00a0'}</div>)}{entry.result.games && entry.result.games.length > 0 && <div className="game-list"><div className="game-row table-heading"><span>ID / NAME</span><span>CATEGORY</span><span>LAUNCH</span></div>{entry.result.games.map(game => <div className="game-row" key={game.id}><span><strong>{game.title}</strong><small>{game.id}</small></span><span className="muted">{game.category}</span><button onClick={() => run(`play ${game.id}`)} aria-label={`Play ${game.title}`}>play ↗</button></div>)}</div>}{entry.result.launch && <a className="launch-link" href={entry.result.launch.url} target="_blank" rel="noopener noreferrer">Open {entry.result.launch.title} ↗ <span className="muted">(if the new tab did not open)</span></a>}</div></div>)}</div>
          <form className="prompt" onSubmit={event => { event.preventDefault(); run(input); }}><label htmlFor="command"><span>guest</span>@underground<span className="muted">:~$</span></label><input ref={inputRef} id="command" autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false} value={input} placeholder="type a command..." aria-label="Terminal command" onChange={e => setInput(e.target.value)} onKeyDown={e => {
            if (e.key === 'ArrowUp') { e.preventDefault(); if (cursor === history.length) setDraft(input); const next = Math.max(0,cursor-1); setCursor(next); setInput(history[next] ?? input); }
            if (e.key === 'ArrowDown') { e.preventDefault(); const next = Math.min(history.length,cursor+1); setCursor(next); setInput(history[next] ?? draft); }
            if (e.key === 'Tab') { const matches = complete(input); if (matches.length) { e.preventDefault(); if (matches.length === 1) setInput(matches[0] + ' '); else setEntries(prev => [...prev, { id: ++sequence.current, command: input, result: { lines: [matches.join('    ')] } }].slice(-150)); } }
            if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); setEntries([]); }
            if (e.key === 'Escape' || e.ctrlKey && e.key.toLowerCase() === 'u') { e.preventDefault(); setInput(''); setCursor(history.length); }
          }}/><button type="submit" className="enter-button" aria-label="Execute command">↵</button></form><div ref={bottom}/>
        </div>
        <div className="terminal-status"><span><i/> SYSTEM READY <span className="status-separator">/</span> <span className="muted">guest session</span></span><span>UTF-8 <span className="status-separator">/</span> {theme.toUpperCase()}</span></div>
      </section>
      <nav className="quick-commands" aria-label="Quick commands"><span>QUICK START</span>{[['help','Command guide'],['games','Browse games'],['about','About the network']].map(([command,label]) => <button key={command} onClick={() => run(command)}><span className="command-dollar">$</span> {command}<span className="quick-description">{label}</span><span className="quick-arrow">↗</span></button>)}</nav>
      <div className="below-terminal"><p><span className="accent">↳</span> Curiosity is the only prerequisite.</p><p><kbd>↑</kbd><kbd>↓</kbd> history <span>·</span> <kbd>tab</kbd> autocomplete <span>·</span> <kbd>ctrl L</kbd> clear</p></div>
    </main>
    <footer><span>INDEPENDENT. UNOFFICIAL. ALWAYS CURIOUS.</span><span>NO TRACKERS. JUST TERMINAL.</span></footer>
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
