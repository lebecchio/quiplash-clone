import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { isThemeId, type ThemeId } from './game/avatars';
import { applyTheme, THEMES } from './themes';
import { HostApp } from './host/HostApp';
import { clearSavedState } from './host/persist';
import { PhoneApp } from './phone/PhoneApp';
import './styles.css';

type Route =
  | { name: 'home' }
  | { name: 'host'; theme: ThemeId | null }
  | { name: 'join'; code: string; theme: ThemeId };

function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  const t = params.get('theme');
  const theme: ThemeId = isThemeId(t) ? t : 'default';
  if (path === '/host') return { name: 'host', theme: isThemeId(t) ? t : null };
  if (path === '/join') {
    const code = (params.get('code') ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    return { name: 'join', code, theme };
  }
  return { name: 'home' };
}

function App() {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash));
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);

  if (route.name === 'host') return route.theme ? <HostApp theme={route.theme} /> : <ThemePicker />;
  if (route.name === 'join' && route.code.length === 4) return <PhoneApp code={route.code} theme={route.theme} />;
  return <Home bad={route.name === 'join'} />;
}

function Home({ bad }: { bad: boolean }) {
  const [code, setCode] = useState('');
  useEffect(() => applyTheme('default'), []);
  return (
    <main className="screen phone">
      <h1>Quiplash Clone</h1>
      <a className="big primary link" href="#/host">
        Host a game on this screen
      </a>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          location.hash = `#/join?code=${code}`;
        }}
      >
        <label htmlFor="code">Join with a room code</label>
        {bad && <p className="notice">Enter the 4-letter room code.</p>}
        <input id="code" value={code} maxLength={4} autoCapitalize="characters" onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button className="big" disabled={code.length !== 4}>
          Join
        </button>
      </form>
    </main>
  );
}

/** Shown after "Host a game": pick which version of the game to run. */
function ThemePicker() {
  useEffect(() => {
    applyTheme('default');
    clearSavedState();
  }, []);
  return (
    <main className="screen phone">
      <h1>Which version?</h1>
      <a className="big primary link" href="#/host?theme=default">
        {THEMES.default.title}
      </a>
      <a className="big link lars-link" href="#/host?theme=lars">
        {THEMES.lars.emoji} Lars version
      </a>
      <p className="muted">
        <a href="#/">← Back</a>
      </p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
