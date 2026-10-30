# Quiplash Clone: Spec

## Product
- This is a Quiplash-style game to play with friends. It uses the original loop with custom prompts.
- It supports 3 to 12 players, in the same room or over a video call.
- One shared host screen shows the game. Players use their phone browsers as controllers.

## Joining and roles
- The host screen shows a 4-letter room code and a QR code.
- Players join only in the lobby. They type a name, and there are no accounts.
- The first player to join is the VIP. The VIP's phone can start the game, skip a timer, skip a matchup, and choose "play again".
- Players rejoin with a token stored in localStorage.

## Prompts
- Prompts come from a JSON pack file in the repo, plus 0 to 3 prompts from each player in the lobby.
- The game uses player prompts first. Nobody answers a prompt they wrote.
- With 3 to 8 players, prompts go out in a ring: player i gets prompts i and i+1.
- With 9 to 12 players, each player gets 1 prompt per round, and players are paired up.
- With 9 or 11 players, one player answers a second prompt so every prompt has 2 answers. A different player gets it each round.

## Rounds
- Players get 90 seconds to write answers and 20 seconds to vote.
- Answers have a limit of 45 characters. A blank answer becomes "[no answer]".
- Authors do not vote on their own matchup.
- There is no word filter.
- Scores:
  - In round 1, each prompt is worth 1000 points, shared by vote percentage. A "Quiplash" earns a bonus of 250.
  - In round 2, each prompt is worth 2000 points, and the bonus is 500.
  - In the final round, each player gets 3 votes to give to any answers.
- The host screen reads prompts and answers aloud with browser text-to-speech. It has a mute switch.
- At the end, the host screen shows a scoreboard. "Play again" keeps the room and the players and resets the scores.

## Failures
- If a player disconnects, the game continues and the timers keep running.
- If fewer than 3 players are connected, the game pauses until someone rejoins or the VIP ends the game.
- The room ends when the host closes the tab and the saved state is cleared.

## Technology
- Everything is TypeScript, with React for the host and phone screens.
- GitHub Pages hosts the site as static files. There is no server.
- The host screen's browser acts as the server. Phones connect to it over WebRTC with PeerJS.
- The game rules are a pure state machine: `(state, action) → state`. Vitest unit tests cover only this state machine.
- `viewFor(state, playerId)` sends each client only what it is allowed to see.
- Version 1 uses plain, large, high-contrast screens with no animations.

## How to build

### Tools and libraries
- Vite with React and TypeScript. The build writes static files to `dist/`.
- Runtime libraries: `react`, `react-dom`, `peerjs`, `qrcode`. No others.
- Development libraries: `vite`, `typescript`, `vitest`. No others.

### Layout
One Vite app with these folders:
- `src/game`: the pure state machine, `viewFor`, the seeded random function, and the prompt packs. No browser APIs.
- `src/net`: the PeerJS code and the message types.
- `src/host`: the host screen.
- `src/phone`: the phone screen.

### Routing
- Use hash routes: `#/host` and `#/join?code=ABCD`. A page reload then does not give a 404 error on GitHub Pages.

### Connection
- The host registers the PeerJS ID `qlc-<ROOMCODE>`, for example `qlc-ABCD`. If the ID is taken, the host picks a new code.
- Phones connect to that ID through the free public PeerJS broker.
- Use free public STUN servers plus a TURN relay (free Open Relay by default, overridable with `VITE_TURN_URLS`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` at build time), so phones on mobile data or isolated Wi-Fi can still connect.
- After 10 seconds without a connection, the join screen shows "Can't connect? Join the host's Wi-Fi".

### Messages
- Phone to host: `{ type: "action", action }`. Actions are join, rejoin, submitPrompt, answer, vote, and VIP commands.
- Host to phone: `{ type: "view", view }`. The host sends the full `viewFor` result after every state change.
- The host identifies the sender by the WebRTC connection, never by a `playerId` field in the message.
- A player's token links them to a connection only when they join or rejoin.

### State machine
- Time is passed in. Each action carries `now`, and the state machine never reads the clock.
- The host sends a `tick` action every second.
- The host sends each phone the phase deadline. Each phone draws its own countdown from it.
- The state holds a seed. A seeded random function (such as mulberry32) shuffles prompts and makes room codes.
- Tests fix the seed to get the same result every time.

### Prompt packs
- The default pack is `src/game/prompts/default.json`. It is imported into the bundle at build time.
- A new pack is a new JSON file and a new build.

### Saved state and reload
- The host saves the state to its localStorage after each action.
- The saved state has a `version` number. If the number does not match after a deploy, the host throws away the old state.
- On reload, the host loads the state and registers the same PeerJS ID again. The broker can keep the old ID for up to about a minute, so the host retries every 5 seconds.
- Phones reconnect automatically and rejoin with their token.
- The phone screen asks for the Screen Wake Lock API while a game runs.

### Deploy
- A GitHub Actions workflow builds the site and deploys it to Pages on every push to `main`. It uses `actions/deploy-pages`.
- The workflow sets Vite's `base` from the repo name. The spec does not name the repo.

### Build order
1. The state machine and the Vitest tests for a full game with fake players.
2. The PeerJS connection: one host and one phone that send a test message.
3. The lobby, with joining, the VIP, and the QR code.
4. Answers and voting for rounds 1 and 2.
5. The final round, the scores, and "play again".
6. Text-to-speech, the wake lock, rejoining, and saved state.
7. The GitHub Actions deploy.
