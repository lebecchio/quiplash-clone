/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Comma-separated TURN urls, e.g. "turn:turn.example.com:3478,turns:turn.example.com:5349". */
  readonly VITE_TURN_URLS?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
  /** Your own PeerJS server instead of the public 0.peerjs.com. */
  readonly VITE_PEER_HOST?: string;
  readonly VITE_PEER_PORT?: string;
  readonly VITE_PEER_PATH?: string;
  readonly VITE_PEER_SECURE?: string;
}
