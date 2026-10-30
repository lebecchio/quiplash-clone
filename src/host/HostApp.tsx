import QRCode from 'qrcode';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ThemeId } from '../game/avatars';
import { createGame } from '../game/reducer';
import { viewFor, type View } from '../game/view';
import { HostServer, type SipEvent } from '../net/host';
import { STRINGS, type Strings } from '../i18n';
import { applyTheme, THEMES } from '../themes';
import { Carousel } from '../ui/Carousel';
import { CloverRain } from '../ui/CloverRain';
import { Countdown } from '../ui/Countdown';
import { Scoreboard } from '../ui/Scoreboard';
import { loadState, saveState } from './persist';
import { FileMusic, LobbyMusic } from './music';
import { speak, stopSpeaking } from './speech';
import { playSip } from './sips';

const SIP_POPUP_MS = 3000;
const SIP_QUEUE_MAX = 6;

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
  const s = STRINGS[view.theme];
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

  // Donated sips: one 3-second popup at a time, the rest wait in line.
  const [sipQueue, setSipQueue] = useState<SipEvent[]>([]);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  useEffect(
    () => server.onSip((e) => setSipQueue((q) => (q.length < SIP_QUEUE_MAX ? [...q, e] : q))),
    [server],
  );
  const sip = sipQueue[0];
  useEffect(() => {
    if (!sip) return;
    if (!mutedRef.current) playSip();
    const t = setTimeout(() => setSipQueue((q) => q.slice(1)), SIP_POPUP_MS);
    return () => clearTimeout(t);
  }, [sip?.id]);

  // Read prompts and answers aloud.
  const m = view.matchup;
  const speechKey =
    view.phase === 'voting' && m
      ? `v${view.round}-${m.index}`
      : view.phase === 'quiz' && view.quiz
        ? `q${view.round}-${view.quiz.index}`
        : view.phase === 'finalAnswering'
          ? 'final'
          : '';
  useEffect(() => {
    if (!speechKey || muted) return stopSpeaking();
    if (view.phase === 'voting' && m) speak([m.prompt, m.answers[0], m.answers[1]], s.lang);
    else if (view.phase === 'quiz' && view.quiz) speak([view.quiz.question, ...view.quiz.options], s.lang);
    else if (view.final) speak([view.final.prompt], s.lang);
    return stopSpeaking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechKey, muted]);

  return (
    <main className="screen host">
      {view.theme === 'lars' && <CloverRain />}
      <button className="mute" onClick={() => setMuted(!muted)}>
        {muted ? s.soundOff : s.soundOn}
      </button>
      <Header view={view} />
      {status !== 'ready' && (
        <p className="notice">
          {status === 'connecting' ? s.connectingBroker : s.reconnectingBroker}
        </p>
      )}
      {view.phase === 'lobby' && !unlocked && !muted && <p className="music-hint">{s.musicHint}</p>}
      <Body view={view} photos={THEMES[view.theme].photos} />
      {sip && s.sips && (
        <div className="sip-popup" key={sip.id} role="status">
          <div className="sip-emoji">🍺</div>
          <div className="sip-title">
            {sip.to.avatar} {s.sips.title(sip.to.name)}
          </div>
          <div className="sip-from">
            {sip.from.avatar} {s.sips.from(sip.from.name)}
          </div>
        </div>
      )}
      {view.paused && (
        <div className="overlay">
          <h1>{s.pausedTitle}</h1>
          <p>{s.pausedText}</p>
        </div>
      )}
    </main>
  );
}

const QUIZ_SHAPES = ['▲', '◆', '●', '■'];

function Header({ view }: { view: View }) {
  const s = STRINGS[view.theme];
  const labels: Record<string, string> = {
    answering: s.round(view.round),
    voting: s.round(view.round),
    reveal: s.round(view.round),
    roundScores: s.roundScores(view.round),
    quiz: s.quizHeader,
    quizReveal: s.quizHeader,
    finalAnswering: s.finalRound,
    finalVoting: s.finalRound,
    finalResults: s.finalRound,
    gameOver: s.gameOver,
  };
  return (
    <header>
      <span>{labels[view.phase] ?? `${THEMES[view.theme].title} ${THEMES[view.theme].emoji}`}</span>
      <span>
        {s.room} {view.roomCode}
      </span>
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
  const s: Strings = STRINGS[view.theme];
  const m = view.matchup;
  switch (view.phase) {
    case 'lobby':
      return <Lobby view={view} photos={photos} />;
    case 'answering':
      return (
        <section>
          <h1>{s.writeAnswers}</h1>
          <Progress view={view} />
        </section>
      );
    case 'voting':
    case 'reveal':
      if (!m) return null;
      return (
        <section>
          <p className="muted">
            {s.matchup(m.index + 1, m.total)}
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
                      {s.votes(m.votes[i])} · +{m.points[i]}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {m.quiplash && <h1 className="quiplash">{s.cleanSweep}</h1>}
          {view.phase === 'voting' && (
            <>
              <p className="muted">{s.voteOnPhone}</p>
              <Progress view={view} />
            </>
          )}
        </section>
      );
    case 'roundScores':
    case 'gameOver':
      return (
        <section>
          <h1>{view.phase === 'gameOver' ? s.finalScores : s.scores}</h1>
          <div className="with-photos">
            <Scoreboard players={view.players} />
            <Carousel photos={photos} />
          </div>
          {view.phase === 'gameOver' && <p className="muted">{s.playAgainHint}</p>}
        </section>
      );
    case 'quiz':
    case 'quizReveal': {
      const q = view.quiz;
      if (!q) return null;
      const revealed = q.correct !== null;
      return (
        <section>
          <p className="muted">{s.quizQuestion(q.index + 1, q.total)}</p>
          <h1 className="prompt">{q.question}</h1>
          <div className="quiz-options">
            {q.options.map((o, i) => (
              <div
                key={i}
                className={`quiz-option quiz-${i}${revealed ? (i === q.correct ? ' correct' : ' wrong') : ''}`}
              >
                <span className="quiz-shape">{QUIZ_SHAPES[i]}</span>
                <span className="quiz-text">{o}</span>
                {q.counts && <span className="quiz-count">{q.counts[i]}</span>}
              </div>
            ))}
          </div>
          {!revealed && (
            <>
              <p className="muted">{s.quizOnPhone}</p>
              <Progress view={view} />
            </>
          )}
          {q.winners && (
            <ul className="chips">
              {q.winners.length === 0 && <li>{s.quizNobody}</li>}
              {q.winners.map((w) => (
                <li key={w.name} className="done">
                  {w.avatar} {w.name} +{w.points}
                </li>
              ))}
            </ul>
          )}
        </section>
      );
    }
    case 'finalAnswering':
      return (
        <section>
          <h1 className="prompt">{view.final?.prompt}</h1>
          <p className="muted">{s.finalEveryone}</p>
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
          {!results && <p className="muted">{s.finalPick}</p>}
          <ul className="finals">
            {answers.map((a) => (
              <li key={a.index}>
                <span className="text">{a.text}</span>
                {results && (
                  <span className="meta">
                    {a.author} · {s.votes(a.votes ?? 0)} · +{a.points}
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
  const s = STRINGS[view.theme];
  const [qr, setQr] = useState('');
  const joinUrl = `${location.origin}${location.pathname}#/join?code=${view.roomCode}${view.theme === 'default' ? '' : `&theme=${view.theme}`}`;
  useEffect(() => {
    QRCode.toDataURL(joinUrl, { margin: 2, width: 360, color: { dark: '#000000', light: '#ffffff' } }).then(setQr, () => setQr(''));
  }, [joinUrl]);
  const vip = view.players.find((p) => p.isVip);
  return (
    <section className="lobby">
      <div className="join">
        <p>{s.joinOnPhone}</p>
        <div className="code">{view.roomCode}</div>
        {qr && <img src={qr} alt={s.qrAlt(view.roomCode)} width={260} height={260} />}
        <p className="muted small">{joinUrl}</p>
      </div>
      <div>
        <h2>{s.players(view.players.length)}</h2>
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
              ? s.vipCanStart(vip.name)
              : s.needMore(view.lobby?.minPlayers ?? 3, vip.name)
            : s.waitingFirst}
        </p>
        {(view.lobby?.maxPrompts ?? 0) > 0 && <p className="muted">{s.promptCount(view.lobby?.promptCount ?? 0)}</p>}
      </div>
      <Carousel photos={photos} />
    </section>
  );
}
