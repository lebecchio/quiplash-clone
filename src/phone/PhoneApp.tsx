import { avatarsFor, type ThemeId } from '../game/avatars';
import { STRINGS, type Strings } from '../i18n';
import { applyTheme } from '../themes';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { View } from '../game/view';
import { PhoneClient } from '../net/client';
import { CloverRain } from '../ui/CloverRain';
import { Countdown } from '../ui/Countdown';
import { Scoreboard } from '../ui/Scoreboard';
import { useWakeLock } from './useWakeLock';

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
  const s = STRINGS[activeTheme];
  useEffect(() => applyTheme(activeTheme), [activeTheme]);
  useWakeLock(!!view && view.phase !== 'lobby' && view.phase !== 'gameOver');

  const cantConnect = snap.cantConnect && (
    <p className="notice">
      {s.cantConnect}
      <br />
      <small>{s.stuckAt[snap.stage]}</small>
    </p>
  );

  if (!snap.joined || !view) {
    return (
      <main className="screen phone">
        <h1>{s.roomTitle(code)}</h1>
        {snap.rejected && <p className="notice">{s.rejected[snap.rejected]}</p>}
        {!snap.joined ? (
          <NameForm client={client} connected={snap.status === 'connected'} theme={activeTheme} />
        ) : (
          <p>{s.connecting}</p>
        )}
        {cantConnect}
      </main>
    );
  }

  return (
    <main className="screen phone">
      {activeTheme === 'lars' && <CloverRain />}
      <TopBar view={view} offset={snap.clockOffset} />
      {snap.status !== 'connected' && <p className="notice">{s.reconnecting}</p>}
      {cantConnect}
      {view.paused && <p className="notice">{s.pausedBanner}</p>}
      <Screen view={view} client={client} />
      {view.players.length > 1 && STRINGS[view.theme].sips && <SipDonor view={view} client={client} />}
      {view.me?.isVip && <VipControls view={view} client={client} />}
    </main>
  );
}

function NameForm({ client, connected, theme }: { client: PhoneClient; connected: boolean; theme: ThemeId }) {
  const s = STRINGS[theme];
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
      <label>{s.pickAvatar}</label>
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
      <label htmlFor="name">{s.yourName}</label>
      <input id="name" value={name} maxLength={15} autoComplete="off" onChange={(e) => setName(e.target.value)} />
      <button className="big" disabled={!name.trim() || !connected}>
        {connected ? s.join : s.connecting}
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
  const s: Strings = STRINGS[view.theme];
  const me = view.players.find((p) => p.id === view.me?.id);
  switch (view.phase) {
    case 'lobby':
      return <LobbyScreen view={view} client={client} />;
    case 'answering':
      return <AnswerScreen view={view} client={client} />;
    case 'voting': {
      const m = view.matchup!;
      if (m.iAmAuthor) return <Message title={s.yoursTitle} text={s.yoursText} />;
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
          {m.myVote !== null && <p className="muted">{s.voteSaved}</p>}
        </section>
      );
    }
    case 'reveal': {
      const m = view.matchup!;
      return (
        <Message
          title={m.quiplash ? s.cleanSweep : s.results}
          text={m.authors && m.points ? m.answers.map((a, i) => `${a} (${m.authors![i]}, +${m.points![i]})`).join('  vs  ') : ''}
        />
      );
    }
    case 'roundScores':
    case 'gameOver':
      return (
        <section>
          <h2>{view.phase === 'gameOver' ? s.finalScores : s.scores}</h2>
          <Scoreboard players={view.players} meId={me?.id} />
        </section>
      );
    case 'quiz': {
      const q = view.quiz!;
      return (
        <section>
          <p className="muted">{s.quizQuestion(q.index + 1, q.total)}</p>
          <h2>{q.question}</h2>
          {q.options.map((o, i) => (
            <button
              key={i}
              disabled={q.myChoice !== null}
              className={`big quiz-btn quiz-${i}${q.myChoice === i ? ' picked' : ''}`}
              onClick={() => client.act({ type: 'quizAnswer', choice: i as 0 | 1 | 2 | 3 })}
            >
              <span className="quiz-shape">{QUIZ_SHAPES[i]}</span> {o}
            </button>
          ))}
          {q.myChoice !== null && <p className="muted">{s.quizLocked}</p>}
        </section>
      );
    }
    case 'quizReveal': {
      const q = view.quiz!;
      const title = q.myChoice === null ? s.quizNoAnswer : q.myChoice === q.correct ? s.quizCorrect : s.quizWrong;
      return (
        <section>
          <h2>{title}</h2>
          <p className="muted">{q.question}</p>
          <p className="quiz-answer">{q.options[q.correct!]}</p>
          {q.myPoints! > 0 && <p className="quiz-points">+{q.myPoints}</p>}
        </section>
      );
    }
    case 'finalAnswering':
      return <FinalAnswerScreen view={view} client={client} />;
    case 'finalVoting':
      return <FinalVoteScreen view={view} client={client} />;
    case 'finalResults':
      return <Message title={s.finalResultsTitle} text={s.lookBigScreen} />;
  }
}

const QUIZ_SHAPES = ['▲', '◆', '●', '■'];

function Message({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}

function LobbyScreen({ view, client }: { view: View; client: PhoneClient }) {
  const s = STRINGS[view.theme];
  const [text, setText] = useState('');
  const lobby = view.lobby!;
  const canWrite = lobby.maxPrompts > 0;
  const full = lobby.myPrompts.length >= lobby.maxPrompts;
  return (
    <section>
      <h2>{s.inTitle}</h2>
      <p className="muted">
        {canWrite ? s.lobbyInfo(view.players.length, lobby.maxPrompts) : s.lobbyWait(view.players.length)}
      </p>
      <ul className="list">
        {lobby.myPrompts.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      {canWrite && !full && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) client.act({ type: 'submitPrompt', text });
            setText('');
          }}
        >
          <input value={text} maxLength={100} placeholder={s.promptPlaceholder} onChange={(e) => setText(e.target.value)} />
          <button disabled={!text.trim()}>{s.addPrompt}</button>
        </form>
      )}
      {view.me?.isVip && (
        <>
          <p>{s.youAreVip}</p>
          <button className="big primary" disabled={!lobby.canStart} onClick={() => client.act({ type: 'start' })}>
            {lobby.canStart ? s.startGame : s.needPlayers(lobby.minPlayers)}
          </button>
        </>
      )}
    </section>
  );
}

function AnswerScreen({ view, client }: { view: View; client: PhoneClient }) {
  const s = STRINGS[view.theme];
  const [text, setText] = useState('');
  const tasks = view.tasks ?? [];
  const next = tasks.find((t) => t.answer === null);
  if (!next) return <Message title={s.doneTitle} text={s.waitingOthers} />;
  const answered = tasks.length - tasks.filter((t) => t.answer === null).length;
  return (
    <section>
      <p className="muted">
        {s.promptOf(answered + 1, tasks.length)}
      </p>
      <h2>{next.prompt}</h2>
      <AnswerBox
        s={s}
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

function AnswerBox({ s, text, setText, onSubmit }: { s: Strings; text: string; setText: (t: string) => void; onSubmit: () => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <textarea value={text} maxLength={45} rows={3} autoFocus onChange={(e) => setText(e.target.value)} />
      <p className="muted small">{s.charsLeft(45 - text.length)}</p>
      <button className="big primary">{s.submit}</button>
    </form>
  );
}

function FinalAnswerScreen({ view, client }: { view: View; client: PhoneClient }) {
  const s = STRINGS[view.theme];
  const [text, setText] = useState('');
  const f = view.final!;
  if (f.answered) return <Message title={s.doneTitle} text={s.waitingOthers} />;
  return (
    <section>
      <h2>{f.prompt}</h2>
      <AnswerBox s={s} text={text} setText={setText} onSubmit={() => client.act({ type: 'answer', matchupId: 0, text })} />
    </section>
  );
}

function FinalVoteScreen({ view, client }: { view: View; client: PhoneClient }) {
  const s = STRINGS[view.theme];
  const f = view.final!;
  const [picked, setPicked] = useState<number[]>([]);
  if (f.myVotes) return <Message title={s.votesSent} text={s.waitingOthers} />;
  const toggle = (i: number) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length < f.maxVotes ? [...p, i] : p));
  return (
    <section>
      <h2>{f.prompt}</h2>
      <p className="muted">
        {s.pickUpTo(f.maxVotes, picked.length)}
      </p>
      {f.answers.map((a) => (
        <button
          key={a.index}
          disabled={a.mine}
          className={`big choice${picked.includes(a.index) ? ' picked' : ''}`}
          onClick={() => toggle(a.index)}
        >
          {a.text}
          {a.mine ? s.yoursSuffix : ''}
        </button>
      ))}
      <button className="big primary" onClick={() => client.act({ type: 'finalVote', answerIds: picked })}>
        {s.sendVotes}
      </button>
    </section>
  );
}

const SIP_COOLDOWN_MS = 4000;

function SipDonor({ view, client }: { view: View; client: PhoneClient }) {
  const s = STRINGS[view.theme].sips!;
  const [open, setOpen] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [coolingDown, setCoolingDown] = useState(false);
  const others = view.players.filter((p) => p.id !== view.me?.id);
  useEffect(() => {
    if (!sentTo) return;
    const t = setTimeout(() => setSentTo(null), SIP_COOLDOWN_MS);
    return () => clearTimeout(t);
  }, [sentTo]);
  if (!open) {
    return (
      <button className="big sip-btn" onClick={() => setOpen(true)}>
        {s.donate}
      </button>
    );
  }
  return (
    <section className="sip-picker">
      <p className="muted">{sentTo ? s.sent(sentTo) : s.pick}</p>
      <div className="sip-targets">
        {others.map((p) => (
          <button
            key={p.id}
            disabled={coolingDown}
            onClick={() => {
              client.act({ type: 'sip', toId: p.id });
              setSentTo(p.name);
              setCoolingDown(true);
              setTimeout(() => setCoolingDown(false), SIP_COOLDOWN_MS);
            }}
          >
            {p.avatar} {p.name}
          </button>
        ))}
      </div>
      <button className="link-btn" onClick={() => setOpen(false)}>
        ✕
      </button>
    </section>
  );
}

function VipControls({ view, client }: { view: View; client: PhoneClient }) {
  const s = STRINGS[view.theme];
  const p = view.phase;
  const active = p !== 'lobby' && p !== 'gameOver';
  return (
    <footer>
      <strong>{s.vip}</strong>
      {p === 'gameOver' && (
        <button className="primary" onClick={() => client.act({ type: 'playAgain' })}>
          {s.playAgain}
        </button>
      )}
      {active && !view.paused && (
        <>
          <button onClick={() => client.act({ type: 'skipTimer' })}>{s.skipTimer}</button>
          {(p === 'voting' || p === 'reveal') && <button onClick={() => client.act({ type: 'skipMatchup' })}>{s.skipMatchup}</button>}
        </>
      )}
      {active && (
        <button
          className="danger"
          onClick={() => {
            if (confirm(s.confirmEnd)) client.act({ type: 'endGame' });
          }}
        >
          {s.endGame}
        </button>
      )}
    </footer>
  );
}
