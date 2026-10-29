import { Peer, type DataConnection } from 'peerjs';
import type { View } from '../game/view';
import { ICE_CONFIG, peerIdFor, type ClientMessage, type HostMessage, type PhoneAction, type RejectReason } from './messages';

export type ClientStatus = 'connecting' | 'connected';

export interface ClientSnapshot {
  status: ClientStatus;
  view: View | null;
  rejected: RejectReason | null;
  /** True after 10 seconds without a connection. */
  cantConnect: boolean;
  /** Add to Date.now() to get the host's clock. */
  clockOffset: number;
  joined: boolean;
}

interface Saved {
  token: string;
  name: string;
}

const CANT_CONNECT_MS = 10_000;
const RETRY_MS = 2000;
const storageKey = (code: string) => `qlc-player-${code}`;

function loadSaved(code: string): Saved | null {
  try {
    const v = JSON.parse(localStorage.getItem(storageKey(code)) ?? 'null');
    return v && typeof v.token === 'string' ? v : null;
  } catch {
    return null;
  }
}

function newToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes); // randomUUID needs a secure context; this does not
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** A phone's side of the connection: joins or rejoins, keeps reconnecting, exposes the latest view. */
export class PhoneClient {
  private snap: ClientSnapshot = {
    status: 'connecting',
    view: null,
    rejected: null,
    cantConnect: false,
    clockOffset: 0,
    joined: false,
  };
  private listeners = new Set<() => void>();
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private saved: Saved | null;
  private stopped = false;
  private cantConnectTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private code: string) {
    this.saved = loadSaved(code);
    this.snap.joined = this.saved !== null;
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  };
  getSnapshot = () => this.snap;

  private update(patch: Partial<ClientSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  start() {
    this.armCantConnect();
    this.createPeer();
  }

  stop() {
    this.stopped = true;
    if (this.cantConnectTimer) clearTimeout(this.cantConnectTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.peer?.destroy();
  }

  private armCantConnect() {
    if (this.cantConnectTimer) clearTimeout(this.cantConnectTimer);
    this.cantConnectTimer = setTimeout(() => this.update({ cantConnect: true }), CANT_CONNECT_MS);
  }

  private createPeer() {
    if (this.stopped) return;
    const peer = new Peer({ config: ICE_CONFIG });
    this.peer = peer;
    peer.on('open', () => this.connect());
    peer.on('disconnected', () => {
      if (!peer.destroyed) peer.reconnect();
    });
    peer.on('error', () => this.scheduleRetry(true));
  }

  private scheduleRetry(recreatePeer = false) {
    if (this.stopped) return;
    this.update({ status: 'connecting' });
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      if (recreatePeer || !this.peer || this.peer.destroyed) {
        this.peer?.destroy();
        this.createPeer();
      } else {
        this.connect();
      }
    }, RETRY_MS);
  }

  private connect() {
    if (this.stopped || !this.peer) return;
    this.conn?.close();
    const conn = this.peer.connect(peerIdFor(this.code), { reliable: true });
    this.conn = conn;
    conn.on('open', () => {
      if (this.cantConnectTimer) clearTimeout(this.cantConnectTimer);
      this.update({ status: 'connected', cantConnect: false });
      if (this.saved) this.send({ type: 'rejoin', token: this.saved.token });
    });
    conn.on('data', (raw) => this.onMessage(raw as HostMessage));
    const lost = () => {
      if (conn !== this.conn) return;
      this.armCantConnect();
      this.scheduleRetry();
    };
    conn.on('close', lost);
    conn.on('error', lost);
  }

  private onMessage(msg: HostMessage) {
    if (msg.type === 'view') {
      this.update({ view: msg.view, rejected: null, clockOffset: msg.view.now - Date.now() });
    } else if (msg.type === 'rejected') {
      if (msg.reason === 'unknown') this.forget();
      this.update({ rejected: msg.reason, joined: false });
    }
  }

  private forget() {
    this.saved = null;
    try {
      localStorage.removeItem(storageKey(this.code));
    } catch {
      /* private mode: nothing to forget */
    }
  }

  private send(action: PhoneAction) {
    const msg: ClientMessage = { type: 'action', action };
    if (this.conn?.open) this.conn.send(msg);
  }

  join(name: string, avatar: string) {
    const saved = { token: this.saved?.token ?? newToken(), name };
    this.saved = saved;
    try {
      localStorage.setItem(storageKey(this.code), JSON.stringify(saved));
    } catch {
      /* private mode: rejoin after reload won't work, play still does */
    }
    this.update({ joined: true, rejected: null });
    this.send({ type: 'join', token: saved.token, name, avatar });
  }

  act(action: Exclude<PhoneAction, { type: 'join' | 'rejoin' }>) {
    this.send(action);
  }
}
