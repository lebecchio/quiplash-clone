import { avatarsFor, type ThemeId } from '../game/avatars';
import { applyTheme } from '../themes';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { View } from '../game/view';
import { PhoneClient } from '../net/client';
import { CloverRain } from '../ui/CloverRain';
import { Countdown } from '../ui/Countdown';
import { Scoreboard } from '../ui/Scoreboard';
import { useWakeLock } from './useWakeLock';

const REJECTIONS = {
  started: 'That game has already started. You can only join in the lobby.',
  full: 'That room is full (12 players max).',
  unknown: 'The host no longer knows you. Join again.',
} as const;

export function PhoneApp({ code, theme }: { code: string; theme: ThemeId }) {
  const [client, setClient] = useState<PhoneClient | null>(null);
  useEffect(() => {
    const c = new PhoneClient(code);
    setClient(c);
    c.start();
    return () => c.stop();
  }, [code]);
  if (!client) return null;
  return <Phone client={client} code={code} theme={theme} />;
}

function Phone({ client, code, theme }: { client: PhoneClient; code: string; theme: ThemeId }) {
  const snap = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const { view } = snap;
  const activeTheme = view?.theme ?? theme;
  useEffect(() => applyTheme(activeTheme), [activeTheme]);
  useWakeLock(!!view && view.phase !== 'lobby' && view.phase !== 'gameOver');

  const cantConnect = snap.cantConnect && (
    <p className="notice">Can't connect? Join the host's Wi-Fi</p>
  );

  if (!snap.joined || !view) {
    return (
      <main className="screen phone">
        <h1>Room {code}</h1>
        {snap.rejected && <p className="notice">{REJECTIONS[snap.rejected]}</p>}
        {!snap.joined ? (
          <NameForm client={client} connected={snap.status === 'connected'} theme={activeTheme} />
        ) : (
          <p>Connecting…</p>
        )}
        {cantConnect}
      </main>
    );
  }

  return (
    <main className="screen phone">
      {activeTheme === 'lars' && <CloverRain />}
      <TopBar view={view} offset={snap.clockOffset} />
      {snap.status !== 'connected' && <p className="notice">Reconnecting…</p>}
      {cantConnect}
      {view.paused && <p className="notice">Paused: fewer than 3 players connected.</p>}
      <Screen view={view} client={client} />
      {view.me?.isVip && <VipControls view={view} client={client} />}
    </main>
  );
}

function NameForm({ client, connected, theme }: { client: PhoneClient; connected: boolean; theme: ThemeId }) {
  const avatars = avatarsFor(theme);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [random] = useState(() => Math.random());
  const avatar = picked ?? avatars[Math.floor(random * avatars.length)];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) client.join(name, avatar);
      }}
    >
      <label>Pick your avatar</label>
      <div className="avatars" role="radiogroup" aria-label="Avatar">
        {avatars.map((a) => (
          <button
            type="button"
            key={a}
            role="radio"
            aria-checked={a === avatar}
            className={`avatar-btn${a === avatar ? ' picked' : ''}`}
            onClick={() => setPicked(a)}
          >
            {a}
          </button>
        ))}
      </div>
      <label htmlFor="name">Your name</label>
      <input id="name" value={name} maxLength={15} autoComplete="off" onChange={(e) => setName(e.target.value)} />
      <button className="big" disabled={!name.trim() || !connected}>
        {connected ? 'Join' : 'Connecting…'}
      </button>
    </form>
  );
}

function TopBar({ view, offset }: { view: View; offset: number }) {
  return (
    <header>
      <span>
        {view.me?.avatar} {view.me?.name}
      </span>
      <Countdown deadline={view.deadline} offset={offset} paused={view.paused} />
    </header>
  );
}

function Screen({ view, client }: { view: View; client: PhoneClient }) {
  const me = view.players.find((p) => p.id === view.me?.id);
  switch (view.phase) {
    case 'lobby':
      return <LobbyScreen view={view} client={client} />;
    case 'answering':
      return <AnswerScreen view={view} client={client} />;
    case 'voting': {
      const m = view.matchup!;
      if (m.iAmAuthor) return <Message title="This one is yours!" text="Others are voting on your answer." />;
      return (
        <section>
          <h2>{m.prompt}</h2>
          {([0, 1] as const).map((i) => (
            <button
              key={i}
              className={`big choice${m.myVote === i ? ' picked' : ''}`}
              onClick={() => client.act({ type: 'vote', choice: i })}
            >
              {m.answers[i]}
            </button>
          ))}
          {m.myVote !== null && <p className="muted">Vote saved. You can change it until time is up.</p>}
        </section>
      );
    }
    case 'reveal': {
      const m = view.matchup!;
      return (
        <Message
          title={m.quiplash ? 'CLEAN SWEEP!' : 'Results'}
          text={m.authors && m.points ? m.answers.map((a, i) => `${a} (${m.authors![i]}, +${m.points![i]})`).join('  vs  ') : ''}
        />
      );
    }
    case 'roundScores':
    case 'gameOver':
      return (
        <section>
          <h2>{view.phase === 'gameOver' ? 'Final scores' : 'Scores'}</h2>
          <Scoreboard players={view.players} meId={me?.id} />
        </section>
      );
    case 'finalAnswering':
      return <FinalAnswerScreen view={view} client={client} />;
    case 'finalVoting':
      return <FinalVoteScreen view={view} client={client} />;
    case 'finalResults':
      return <Message title="Final results" text="Look at the big screen!" />;
  }
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}

function LobbyScreen({ view, client }: { view: View; client: PhoneClient }) {
  const [text, setText] = useState('');
  const lobby = view.lobby!;
  const full = lobby.myPrompts.length >= lobby.maxPrompts;
  return (
    <section>
      <h2>You're in!</h2>
      <p className="muted">
        {view.players.length} player{view.players.length === 1 ? '' : 's'} so far. Add up to {lobby.maxPrompts} prompts
        for others to answer (optional).
      </p>
      <ul className="list">
        {lobby.myPrompts.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      {!full && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) client.act({ type: 'submitPrompt', text });
            setText('');
          }}
        >
          <input value={text} maxLength={100} placeholder="e.g. The worst name for a pet snake" onChange={(e) => setText(e.target.value)} />
          <button disabled={!text.trim()}>Add prompt</button>
        </form>
      )}
      {view.me?.isVip && (
        <>
          <p>You're the VIP.</p>
          <button className="big primary" disabled={!lobby.canStart} onClick={() => client.act({ type: 'start' })}>
            {lobby.canStart ? 'Start game' : `Need ${lobby.minPlayers} players`}
          </button>
        </>
      )}
    </section>
  );
}

function AnswerScreen({ view, client }: { view: View; client: PhoneClient }) {
  const [text, setText] = useState('');
  const tasks = view.tasks ?? [];
  const next = tasks.find((t) => t.answer === null);
  if (!next) return <Message title="Done!" text="Waiting for the others…" />;
  const answered = tasks.length - tasks.filter((t) => t.answer === null).length;
  return (
    <section>
      <p className="muted">
        Prompt {answered + 1} of {tasks.length}
      </p>
      <h2>{next.prompt}</h2>
      <AnswerBox
        key={next.matchupId}
        text={text}
        setText={setText}
        onSubmit={() => {
          client.act({ type: 'answer', matchupId: next.matchupId, text });
          setText('');
        }}
      />
    </section>
  );
}

function AnswerBox({ text, setText, onSubmit }: { text: string; setText: (t: string) => void; onSubmit: () => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <textarea value={text} maxLength={45} rows={3} autoFocus onChange={(e) => setText(e.target.value)} />
      <p className="muted small">{45 - text.length} characters left</p>
      <button className="big primary">Submit</button>
    </form>
  );
}

function FinalAnswerScreen({ view, client }: { view: View; client: PhoneClient }) {
  const [text, setText] = useState('');
  const f = view.final!;
  if (f.answered) return <Message title="Done!" text="Waiting for the others…" />;
  return (
    <section>
      <h2>{f.prompt}</h2>
      <AnswerBox text={text} setText={setText} onSubmit={() => client.act({ type: 'answer', matchupId: 0, text })} />
    </section>
  );
}

function FinalVoteScreen({ view, client }: { view: View; client: PhoneClient }) {
  const f = view.final!;
  const [picked, setPicked] = useState<number[]>([]);
  if (f.myVotes) return <Message title="Votes sent!" text="Waiting for the others…" />;
  const toggle = (i: number) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length < f.maxVotes ? [...p, i] : p));
  return (
    <section>
      <h2>{f.prompt}</h2>
      <p className="muted">
        Pick up to {f.maxVotes} favorites ({picked.length} chosen)
      </p>
      {f.answers.map((a) => (
        <button
          key={a.index}
          disabled={a.mine}
          className={`big choice${picked.includes(a.index) ? ' picked' : ''}`}
          onClick={() => toggle(a.index)}
        >
          {a.text}
          {a.mine ? ' (yours)' : ''}
        </button>
      ))}
      <button className="big primary" onClick={() => client.act({ type: 'finalVote', answerIds: picked })}>
        Send votes
      </button>
    </section>
  );
}

function VipControls({ view, client }: { view: View; client: PhoneClient }) {
  const p = view.phase;
  const active = p !== 'lobby' && p !== 'gameOver';
  return (
    <footer>
      <strong>VIP</strong>
      {p === 'gameOver' && (
        <button className="primary" onClick={() => client.act({ type: 'playAgain' })}>
          Play again
        </button>
      )}
      {active && !view.paused && (
        <>
          <button onClick={() => client.act({ type: 'skipTimer' })}>Skip timer</button>
          {(p === 'voting' || p === 'reveal') && <button onClick={() => client.act({ type: 'skipMatchup' })}>Skip matchup</button>}
        </>
      )}
      {active && (
        <button
          className="danger"
          onClick={() => {
            if (confirm('End the game now?')) client.act({ type: 'endGame' });
          }}
        >
          End game
        </button>
      )}
    </footer>
  );
}
