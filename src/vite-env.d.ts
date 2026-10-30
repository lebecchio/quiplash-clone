/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Comma-separated TURN urls, e.g. "turn:turn.example.com:3478,turns:turn.example.com:5349". */
  readonly VITE_TURN_URLS?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
}
