import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { isThemeId, type ThemeId } from './game/avatars';
import { applyTheme, THEMES } from './themes';
import { HostApp } from './host/HostApp';
import { PhoneApp } from './phone/PhoneApp';
import './styles.css';

type Route =
  | { name: 'home'; theme: ThemeId }
  | { name: 'host'; theme: ThemeId }
  | { name: 'join'; code: string; theme: ThemeId };

function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  const t = params.get('theme');
  const theme: ThemeId = isThemeId(t) ? t : 'default';
  if (path === '/host') return { name: 'host', theme };
  if (path === '/join') {
    const code = (params.get('code') ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    return { name: 'join', code, theme };
  }
  if (path === '/lars') return { name: 'home', theme: 'lars' };
  return { name: 'home', theme: 'default' };
}

function App() {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash));
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);

  if (route.name === 'host') return <HostApp theme={route.theme} />;
  if (route.name === 'join' && route.code.length === 4) return <PhoneApp code={route.code} theme={route.theme} />;
  return <Home bad={route.name === 'join'} theme={route.theme} />;
}

function Home({ bad, theme }: { bad: boolean; theme: ThemeId }) {
  const [code, setCode] = useState('');
  useEffect(() => applyTheme(theme), [theme]);
  const info = THEMES[theme];
  const themeQuery = theme === 'default' ? '' : `&theme=${theme}`;
  return (
    <main className="screen phone">
      <h1>
        {info.title} {info.emoji}
      </h1>
      <a className="big primary link" href={theme === 'default' ? '#/host' : `#/host?theme=${theme}`}>
        Host a game on this screen
      </a>
      {theme === 'default' ? (
        <a className="big link lars-link" href="#/lars">
          🍀 Lars version
        </a>
      ) : (
        <a className="big link" href="#/">
          ← Back to the normal version
        </a>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          location.hash = `#/join?code=${code}${themeQuery}`;
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

createRoot(document.getElementById('root')!).render(<App />);
