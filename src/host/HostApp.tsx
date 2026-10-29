import QRCode from 'qrcode';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ThemeId } from '../game/avatars';
import { createGame } from '../game/reducer';
import { viewFor, type View } from '../game/view';
import { HostServer } from '../net/host';
import { applyTheme, THEMES } from '../themes';
import { Carousel } from '../ui/Carousel';
import { CloverRain } from '../ui/CloverRain';
import { Countdown } from '../ui/Countdown';
import { Scoreboard } from '../ui/Scoreboard';
import { loadState, saveState } from './persist';
import { FileMusic, LobbyMusic } from './music';
import { speak, stopSpeaking } from './speech';

function useServer(theme: ThemeId): HostServer {
  const ref = useRef<HostServer | null>(null);
  if (!ref.current) {
    const loaded = loadState();
    const saved = loaded && loaded.theme === theme ? loaded : null;
    const state = saved ?? createGame({ seed: (Math.random() * 2 ** 32) >>> 0, now: Date.now(), theme });
    ref.current = new HostServer(state, saved !== null, saveState);
  }
  useEffect(() => {
    const server = ref.current!;
    server.start();
    return () => server.stop();
  }, []);
  return ref.current;
}

export function HostApp({ theme }: { theme: ThemeId }) {
  const server = useServer(theme);
  const state = useSyncExternalStore(server.subscribe, server.getState);
  const status = useSyncExternalStore(server.subscribe, server.getStatus);
  const view = viewFor(state, null);
  useEffect(() => applyTheme(view.theme), [view.theme]);
  const [muted, setMuted] = useState(false);

  // Browsers only allow audio after a click or key press.
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    const unlock = () => setUnlocked(true);
    addEventListener('pointerdown', unlock, { once: true });
    addEventListener('keydown', unlock, { once: true });
    return () => {
      removeEventListener('pointerdown', unlock);
      removeEventListener('keydown', unlock);
    };
  }, []);

  // Lobby music while waiting for players.
  const music = useRef<{ start(): void; stop(): void } | null>(null);
  const themeMusic = THEMES[view.theme].music;
  const playMusic = unlocked && !muted && view.phase === 'lobby';
  useEffect(() => {
    music.current ??= themeMusic ? new FileMusic(`${import.meta.env.BASE_URL}${themeMusic}`) : new LobbyMusic();
    if (playMusic) music.current.start();
    else music.current.stop();
  }, [playMusic]);

  // Read prompts and answers aloud.
  const m = view.matchup;
  const speechKey = view.phase === 'voting' && m ? `v${view.round}-${m.index}` : view.phase === 'finalAnswering' ? 'final' : '';
  useEffect(() => {
    if (!speechKey || muted) return stopSpeaking();
    if (view.phase === 'voting' && m) speak([m.prompt, m.answers[0], m.answers[1]]);
    else if (view.final) speak([view.final.prompt]);
    return stopSpeaking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechKey, muted]);

  return (
    <main className="screen host">
      {view.theme === 'lars' && <CloverRain />}
      <button className="mute" onClick={() => setMuted(!muted)}>
        {muted ? '🔇 Muted' : '🔊 Sound on'}
      </button>
      <Header view={view} />
      {status !== 'ready' && (
        <p className="notice">
          {status === 'connecting' ? 'Connecting to the PeerJS broker…' : 'Reconnecting to the broker… (the old room can take up to a minute to free up)'}
        </p>
      )}
      {view.phase === 'lobby' && !unlocked && !muted && <p className="music-hint">🎵 Click anywhere to turn on the lobby music</p>}
      <Body view={view} photos={THEMES[view.theme].photos} />
      {view.paused && (
        <div className="overlay">
          <h1>Paused</h1>
          <p>Fewer than 3 players are connected. Waiting for someone to rejoin, or the VIP can end the game.</p>
        </div>
      )}
    </main>
  );
}

function Header({ view }: { view: View }) {
  const labels: Record<string, string> = {
    answering: `Round ${view.round}`,
    voting: `Round ${view.round}`,
    reveal: `Round ${view.round}`,
    roundScores: `Round ${view.round} scores`,
    finalAnswering: 'Final round',
    finalVoting: 'Final round',
    finalResults: 'Final round',
    gameOver: 'Game over',
  };
  return (
    <header>
      <span>{labels[view.phase] ?? `${THEMES[view.theme].title} ${THEMES[view.theme].emoji}`}</span>
      <span>Room {view.roomCode}</span>
      <Countdown deadline={view.deadline} paused={view.paused} />
    </header>
  );
}

function Progress({ view }: { view: View }) {
  return (
    <ul className="chips">
      {view.players.map((p) => (
        <li key={p.id} className={`${p.done ? 'done' : ''} ${p.connected ? '' : 'gone'}`}>
          {p.done ? '✓ ' : ''}
          {p.avatar} {p.name}
        </li>
      ))}
    </ul>
  );
}

function Body({ view, photos }: { view: View; photos: string[] }) {
  const m = view.matchup;
  switch (view.phase) {
    case 'lobby':
      return <Lobby view={view} photos={photos} />;
    case 'answering':
      return (
        <section>
          <h1>Write your answers on your phone!</h1>
          <Progress view={view} />
        </section>
      );
    case 'voting':
    case 'reveal':
      if (!m) return null;
      return (
        <section>
          <p className="muted">
            Matchup {m.index + 1} of {m.total}
          </p>
          <h1 className="prompt">{m.prompt}</h1>
          <div className="duel">
            {[0, 1].map((i) => (
              <div key={i} className={`answer${m.votes && m.votes[i] > m.votes[1 - i] ? ' winner' : ''}`}>
                <div className="text">{m.answers[i]}</div>
                {m.authors && m.votes && m.points && (
                  <div className="meta">
                    <strong>{m.authors[i]}</strong>
                    <div>
                      {m.votes[i]} vote{m.votes[i] === 1 ? '' : 's'} · +{m.points[i]}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {m.quiplash && <h1 className="quiplash">QUIPLASH!</h1>}
          {view.phase === 'voting' && (
            <>
              <p className="muted">Vote on your phone!</p>
              <Progress view={view} />
            </>
          )}
        </section>
      );
    case 'roundScores':
    case 'gameOver':
      return (
        <section>
          <h1>{view.phase === 'gameOver' ? 'Final scores' : 'Scores'}</h1>
          <div className="with-photos">
            <Scoreboard players={view.players} />
            <Carousel photos={photos} />
          </div>
          {view.phase === 'gameOver' && <p className="muted">The VIP can choose “Play again” on their phone.</p>}
        </section>
      );
    case 'finalAnswering':
      return (
        <section>
          <h1 className="prompt">{view.final?.prompt}</h1>
          <p className="muted">Everyone answers this one. Write yours on your phone!</p>
          <Progress view={view} />
        </section>
      );
    case 'finalVoting':
    case 'finalResults': {
      const results = view.phase === 'finalResults';
      const answers = [...(view.final?.answers ?? [])];
      if (results) answers.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
      return (
        <section>
          <h1 className="prompt">{view.final?.prompt}</h1>
          {!results && <p className="muted">Each player picks up to 3 favorites on their phone.</p>}
          <ul className="finals">
            {answers.map((a) => (
              <li key={a.index}>
                <span className="text">{a.text}</span>
                {results && (
                  <span className="meta">
                    {a.author} · {a.votes} vote{a.votes === 1 ? '' : 's'} · +{a.points}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {!results && <Progress view={view} />}
        </section>
      );
    }
  }
}

function Lobby({ view, photos }: { view: View; photos: string[] }) {
  const [qr, setQr] = useState('');
  const joinUrl = `${location.origin}${location.pathname}#/join?code=${view.roomCode}${view.theme === 'default' ? '' : `&theme=${view.theme}`}`;
  useEffect(() => {
    QRCode.toDataURL(joinUrl, { margin: 2, width: 360, color: { dark: '#000000', light: '#ffffff' } }).then(setQr, () => setQr(''));
  }, [joinUrl]);
  const vip = view.players.find((p) => p.isVip);
  return (
    <section className="lobby">
      <div className="join">
        <p>Join on your phone</p>
        <div className="code">{view.roomCode}</div>
        {qr && <img src={qr} alt={`QR code to join room ${view.roomCode}`} width={260} height={260} />}
        <p className="muted small">{joinUrl}</p>
      </div>
      <div>
        <h2>
          Players ({view.players.length}/12)
        </h2>
        <ul className="chips">
          {view.players.map((p) => (
            <li key={p.id} className={p.connected ? '' : 'gone'}>
              {p.isVip ? '★ ' : ''}
              {p.avatar} {p.name}
            </li>
          ))}
        </ul>
        <p className="muted">
          {vip
            ? view.lobby?.canStart
              ? `${vip.name} (VIP) can start the game from their phone.`
              : `Need at least ${view.lobby?.minPlayers} players. ${vip.name} is the VIP.`
            : 'Waiting for the first player…'}
        </p>
        <p className="muted">Player-written prompts: {view.lobby?.promptCount ?? 0}</p>
      </div>
      <Carousel photos={photos} />
    </section>
  );
}
