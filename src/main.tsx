import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { HostApp } from './host/HostApp';
import { PhoneApp } from './phone/PhoneApp';
import './styles.css';

type Route = { name: 'home' } | { name: 'host' } | { name: 'join'; code: string };

function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  if (path === '/host') return { name: 'host' };
  if (path === '/join') {
    const code = (new URLSearchParams(query).get('code') ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    return { name: 'join', code };
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

  if (route.name === 'host') return <HostApp />;
  if (route.name === 'join' && route.code.length === 4) return <PhoneApp code={route.code} />;
  return <Home bad={route.name === 'join'} />;
}

function Home({ bad }: { bad: boolean }) {
  const [code, setCode] = useState('');
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

createRoot(document.getElementById('root')!).render(<App />);
