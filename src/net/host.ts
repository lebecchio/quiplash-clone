import { Peer, type DataConnection } from 'peerjs';
import { reduce } from '../game/reducer';
import type { Action, GameState } from '../game/types';
import { viewFor } from '../game/view';
import {
  BROKER,
  ICE_CONFIG,
  parseClientMessage,
  peerIdFor,
  type HostMessage,
  type PhoneAction,
  type RejectReason,
} from './messages';

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
export type HostAction = DistributiveOmit<Action, 'now'>;
export type HostStatus = 'connecting' | 'ready' | 'retrying';

const RETRY_MS = 5000;
export const SIP_COOLDOWN_MS = 4000;

/** A donated sip. Cosmetic only, so it is an event and never part of the game state. */
export interface SipEvent {
  id: number;
  from: { name: string; avatar: string };
  to: { name: string; avatar: string };
}

/**
 * The host screen's browser is the server. It owns the game state, maps each WebRTC
 * connection to a player, and sends every client its own `viewFor` after each change.
 */
export class HostServer {
  state: GameState;
  status: HostStatus = 'connecting';

  private peer: Peer | null = null;
  private listeners = new Set<() => void>();
  private sipListeners = new Set<(e: SipEvent) => void>();
  private lastSip = new Map<string, number>();
  private sipCount = 0;
  private players = new Map<DataConnection, string>();
  private open = new Set<DataConnection>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  /**
   * @param restored true when the state came from a saved game: the room code must
   *   stay the same, so a taken PeerJS id means "wait for the broker to release it".
   */
  constructor(
    initial: GameState,
    private restored: boolean,
    private persist: (s: GameState) => void,
  ) {
    this.state = initial;
  }

  start() {
    this.register();
    this.tickTimer = setInterval(() => this.dispatch({ type: 'tick' }), 1000);
  }

  stop() {
    this.stopped = true;
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.timers.forEach(clearTimeout);
    this.peer?.destroy();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  };
  onSip = (fn: (e: SipEvent) => void) => {
    this.sipListeners.add(fn);
    return () => void this.sipListeners.delete(fn);
  };
  getState = () => this.state;
  getStatus = () => this.status;

  dispatch(action: HostAction) {
    this.state = reduce(this.state, { ...action, now: Date.now() } as Action);
    this.persist(this.state);
    this.broadcast();
    this.listeners.forEach((fn) => fn());
  }

  // ----- PeerJS registration -----

  private setStatus(status: HostStatus) {
    if (this.status === status) return;
    this.status = status;
    this.listeners.forEach((fn) => fn());
  }

  private retryLater() {
    this.setStatus('retrying');
    this.timers.push(setTimeout(() => this.register(), RETRY_MS));
  }

  private register() {
    if (this.stopped) return;
    this.peer?.destroy();
    const peer = new Peer(peerIdFor(this.state.roomCode), { ...BROKER, config: ICE_CONFIG });
    this.peer = peer;

    peer.on('open', () => {
      this.restored = false; // from here on the code is ours
      this.setStatus('ready');
    });
    peer.on('connection', (conn) => this.onConnection(conn));
    peer.on('disconnected', () => {
      if (!peer.destroyed) peer.reconnect();
    });
    peer.on('error', (err) => {
      if (peer !== this.peer) return;
      if (err.type === 'unavailable-id') {
        if (this.restored) {
          // Our old registration may linger at the broker for about a minute.
          this.retryLater();
        } else {
          this.dispatch({ type: 'newRoomCode' });
          this.register();
        }
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error' || err.type === 'socket-closed') {
        this.retryLater();
      }
    });
  }

  // ----- connections -----

  private onConnection(conn: DataConnection) {
    conn.on('open', () => this.open.add(conn));
    conn.on('data', (raw) => this.onData(conn, raw));
    conn.on('close', () => this.onClose(conn));
    conn.on('error', () => this.onClose(conn));
  }

  private onClose(conn: DataConnection) {
    this.open.delete(conn);
    const id = this.players.get(conn);
    this.players.delete(conn);
    if (id && ![...this.players.values()].includes(id)) {
      this.dispatch({ type: 'disconnect', playerId: id });
    }
  }

  private send(conn: DataConnection, msg: HostMessage) {
    if (conn.open) conn.send(msg);
  }

  private onData(conn: DataConnection, raw: unknown) {
    const action = parseClientMessage(raw);
    if (!action) return;
    if (action.type === 'join' || action.type === 'rejoin') {
      this.handleJoin(conn, action);
      return;
    }
    // The sender is whoever owns this connection, never a field in the message.
    const playerId = this.players.get(conn);
    if (!playerId) return;
    if (action.type === 'sip') {
      this.handleSip(playerId, action.toId);
      return;
    }
    this.dispatch({ ...action, playerId } as HostAction);
  }

  private handleSip(fromId: string, toId: string) {
    if (this.state.theme !== 'lars') return;
    const from = this.state.players.find((p) => p.id === fromId);
    const to = this.state.players.find((p) => p.id === toId);
    if (!from || !to || from.id === to.id) return;
    const now = Date.now();
    if (now - (this.lastSip.get(fromId) ?? 0) < SIP_COOLDOWN_MS) return;
    this.lastSip.set(fromId, now);
    const event: SipEvent = {
      id: ++this.sipCount,
      from: { name: from.name, avatar: from.avatar },
      to: { name: to.name, avatar: to.avatar },
    };
    this.sipListeners.forEach((fn) => fn(event));
  }

  private handleJoin(conn: DataConnection, action: Extract<PhoneAction, { type: 'join' | 'rejoin' }>) {
    if (action.type === 'join') {
      this.dispatch({ type: 'join', token: action.token, name: action.name, avatar: action.avatar });
    }
    const player = this.state.players.find((p) => p.token === action.token);
    if (!player) {
      const reason: RejectReason =
        action.type === 'rejoin' ? 'unknown' : this.state.phase !== 'lobby' ? 'started' : 'full';
      this.send(conn, { type: 'rejected', reason });
      return;
    }
    for (const [other, id] of this.players) {
      if (id === player.id && other !== conn) {
        this.players.delete(other);
        other.close();
      }
    }
    this.players.set(conn, player.id);
    if (!player.connected) this.dispatch({ type: 'reconnect', playerId: player.id });
    else this.broadcast();
  }

  private broadcast() {
    for (const [conn, id] of this.players) {
      this.send(conn, { type: 'view', view: viewFor(this.state, id) });
    }
  }
}
