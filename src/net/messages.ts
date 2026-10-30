import type { View } from '../game/view';

/** What a phone may ask for. The host adds the player id from the connection. */
export type PhoneAction =
  | { type: 'join'; token: string; name: string; avatar?: string }
  | { type: 'rejoin'; token: string }
  | { type: 'submitPrompt'; text: string }
  | { type: 'answer'; matchupId: number; text: string }
  | { type: 'vote'; choice: 0 | 1 }
  | { type: 'finalVote'; answerIds: number[] }
  | { type: 'quizAnswer'; choice: 0 | 1 | 2 | 3 }
  | { type: 'sip'; toId: string }
  | { type: 'start' }
  | { type: 'skipTimer' }
  | { type: 'skipMatchup' }
  | { type: 'endGame' }
  | { type: 'playAgain' };

export type ClientMessage = { type: 'action'; action: PhoneAction };

export type RejectReason = 'started' | 'full' | 'unknown';

export type HostMessage = { type: 'view'; view: View } | { type: 'rejected'; reason: RejectReason };

export const ROOM_PREFIX = 'qlc-';
export const peerIdFor = (code: string) => `${ROOM_PREFIX}${code}`;

const env = import.meta.env;
const turnUrls = (env.VITE_TURN_URLS ?? '').split(',').map((u) => u.trim()).filter(Boolean);

/**
 * STUN alone only works when both sides can punch through their NAT, which fails for a
 * phone on mobile data, on a guest Wi-Fi with client isolation, or behind a symmetric NAT:
 * the phone then sits on "Connecting…" forever. A TURN relay fixes that. Set
 * VITE_TURN_URLS / VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL at build time to use your own;
 * otherwise the free Open Relay servers are used.
 */
const TURN_SERVERS: RTCIceServer[] = turnUrls.length
  ? [{ urls: turnUrls, username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL }]
  : [
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ];

/** The PeerJS broker: the free public cloud server unless VITE_PEER_HOST points at your own. */
export const BROKER = env.VITE_PEER_HOST
  ? {
      host: env.VITE_PEER_HOST,
      port: Number(env.VITE_PEER_PORT || 443),
      path: env.VITE_PEER_PATH || '/',
      secure: env.VITE_PEER_SECURE !== 'false',
    }
  : {};

export const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ...TURN_SERVERS,
  ],
};

const str = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length <= max;

/** Validates untrusted data from a phone. Returns null for anything malformed. */
export function parseClientMessage(raw: unknown): PhoneAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as { type?: unknown; action?: unknown };
  if (m.type !== 'action' || !m.action || typeof m.action !== 'object') return null;
  const a = m.action as Record<string, unknown>;
  switch (a.type) {
    case 'join':
      return str(a.token, 100) && str(a.name) && (a.avatar === undefined || str(a.avatar, 16))
        ? { type: 'join', token: a.token, name: a.name, avatar: a.avatar }
        : null;
    case 'rejoin':
      return str(a.token, 100) ? { type: 'rejoin', token: a.token } : null;
    case 'submitPrompt':
      return str(a.text) ? { type: 'submitPrompt', text: a.text } : null;
    case 'answer':
      return Number.isInteger(a.matchupId) && str(a.text)
        ? { type: 'answer', matchupId: a.matchupId as number, text: a.text }
        : null;
    case 'vote':
      return a.choice === 0 || a.choice === 1 ? { type: 'vote', choice: a.choice } : null;
    case 'finalVote':
      return Array.isArray(a.answerIds) && a.answerIds.length <= 50 && a.answerIds.every(Number.isInteger)
        ? { type: 'finalVote', answerIds: a.answerIds as number[] }
        : null;
    case 'quizAnswer':
      return a.choice === 0 || a.choice === 1 || a.choice === 2 || a.choice === 3 ? { type: 'quizAnswer', choice: a.choice } : null;
    case 'sip':
      return str(a.toId, 50) ? { type: 'sip', toId: a.toId } : null;
    case 'start':
    case 'skipTimer':
    case 'skipMatchup':
    case 'endGame':
    case 'playAgain':
      return { type: a.type };
    default:
      return null;
  }
}
