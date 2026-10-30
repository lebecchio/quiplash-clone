# Jim

A party game for 3–12 players: write funny answers to prompts, then vote on the best ones. One shared host screen; everyone plays on their phone.
There is no server: the host's browser runs the game and phones connect over WebRTC (PeerJS).
Full spec: [SPEC.md](SPEC.md).

## Play

Open the site, choose **Host a game** on the big screen, then scan the QR code (or enter the 4-letter code) on each phone.
Phones and host connect over WebRTC. When a direct connection isn't possible (phone on mobile data, guest Wi-Fi with client isolation, strict NAT) traffic goes through a TURN relay. By default that is the free [Open Relay](https://www.metered.ca/tools/openrelay/) service; to use your own, set these at build time (locally in `.env.local`, or as repository variables `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` for the GitHub Pages deploy):

```
VITE_TURN_URLS=turn:turn.example.com:3478,turns:turn.example.com:5349
VITE_TURN_USERNAME=...
VITE_TURN_CREDENTIAL=...
```

## Develop

```
npm install
npm run dev        # local dev server
npm test           # Vitest: the pure state machine in src/game
npm run build      # typecheck + static build to dist/
```

- `src/game`: pure state machine `reduce(state, action)`, `viewFor`, seeded RNG, prompt packs
- `src/net`: PeerJS host/client and message types
- `src/host`, `src/phone`: React screens

Add prompts by editing `src/game/prompts/default.json` (or adding a new JSON file) and rebuilding.

Scoring choices the spec left open: the final round pays 200 points per vote, and the final voting timer is 30s (the spec's 20s is too short for up to 12 answers).
