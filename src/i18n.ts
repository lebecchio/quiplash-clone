import type { ThemeId } from './game/avatars';

/** Every piece of text the host and phone screens show. */
export interface Strings {
  lang: string;
  // host
  soundOn: string;
  soundOff: string;
  connectingBroker: string;
  reconnectingBroker: string;
  musicHint: string;
  pausedTitle: string;
  pausedText: string;
  round: (n: number) => string;
  roundScores: (n: number) => string;
  finalRound: string;
  gameOver: string;
  room: string;
  writeAnswers: string;
  matchup: (i: number, n: number) => string;
  votes: (n: number) => string;
  cleanSweep: string;
  voteOnPhone: string;
  finalScores: string;
  scores: string;
  playAgainHint: string;
  finalEveryone: string;
  finalPick: string;
  joinOnPhone: string;
  qrAlt: (code: string) => string;
  players: (n: number) => string;
  vipCanStart: (name: string) => string;
  needMore: (min: number, name: string) => string;
  waitingFirst: string;
  promptCount: (n: number) => string;
  // phone
  rejected: { started: string; full: string; unknown: string };
  cantConnect: string;
  roomTitle: (code: string) => string;
  connecting: string;
  reconnecting: string;
  pausedBanner: string;
  pickAvatar: string;
  yourName: string;
  join: string;
  yoursTitle: string;
  yoursText: string;
  voteSaved: string;
  results: string;
  finalResultsTitle: string;
  lookBigScreen: string;
  inTitle: string;
  lobbyInfo: (n: number, max: number) => string;
  promptPlaceholder: string;
  addPrompt: string;
  youAreVip: string;
  startGame: string;
  needPlayers: (n: number) => string;
  doneTitle: string;
  waitingOthers: string;
  promptOf: (i: number, n: number) => string;
  charsLeft: (n: number) => string;
  submit: string;
  votesSent: string;
  pickUpTo: (max: number, n: number) => string;
  yoursSuffix: string;
  sendVotes: string;
  vip: string;
  playAgain: string;
  skipTimer: string;
  skipMatchup: string;
  endGame: string;
  confirmEnd: string;
}

const en: Strings = {
  lang: 'en-US',
  soundOn: '🔊 Sound on',
  soundOff: '🔇 Muted',
  connectingBroker: 'Connecting to the PeerJS broker…',
  reconnectingBroker: 'Reconnecting to the broker… (the old room can take up to a minute to free up)',
  musicHint: '🎵 Click anywhere to turn on the lobby music',
  pausedTitle: 'Paused',
  pausedText: 'Fewer than 3 players are connected. Waiting for someone to rejoin, or the VIP can end the game.',
  round: (n) => `Round ${n}`,
  roundScores: (n) => `Round ${n} scores`,
  finalRound: 'Final round',
  gameOver: 'Game over',
  room: 'Room',
  writeAnswers: 'Write your answers on your phone!',
  matchup: (i, n) => `Matchup ${i} of ${n}`,
  votes: (n) => `${n} vote${n === 1 ? '' : 's'}`,
  cleanSweep: 'CLEAN SWEEP!',
  voteOnPhone: 'Vote on your phone!',
  finalScores: 'Final scores',
  scores: 'Scores',
  playAgainHint: 'The VIP can choose “Play again” on their phone.',
  finalEveryone: 'Everyone answers this one. Write yours on your phone!',
  finalPick: 'Each player picks up to 3 favorites on their phone.',
  joinOnPhone: 'Join on your phone',
  qrAlt: (code) => `QR code to join room ${code}`,
  players: (n) => `Players (${n}/12)`,
  vipCanStart: (name) => `${name} (VIP) can start the game from their phone.`,
  needMore: (min, name) => `Need at least ${min} players. ${name} is the VIP.`,
  waitingFirst: 'Waiting for the first player…',
  promptCount: (n) => `Player-written prompts: ${n}`,
  rejected: {
    started: 'That game has already started. You can only join in the lobby.',
    full: 'That room is full (12 players max).',
    unknown: 'The host no longer knows you. Join again.',
  },
  cantConnect: "Can't connect? Join the host's Wi-Fi",
  roomTitle: (code) => `Room ${code}`,
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  pausedBanner: 'Paused: fewer than 3 players connected.',
  pickAvatar: 'Pick your avatar',
  yourName: 'Your name',
  join: 'Join',
  yoursTitle: 'This one is yours!',
  yoursText: 'Others are voting on your answer.',
  voteSaved: 'Vote saved. You can change it until time is up.',
  results: 'Results',
  finalResultsTitle: 'Final results',
  lookBigScreen: 'Look at the big screen!',
  inTitle: "You're in!",
  lobbyInfo: (n, max) =>
    `${n} player${n === 1 ? '' : 's'} so far. Add up to ${max} prompts for others to answer (optional).`,
  promptPlaceholder: 'e.g. The worst name for a pet snake',
  addPrompt: 'Add prompt',
  youAreVip: "You're the VIP.",
  startGame: 'Start game',
  needPlayers: (n) => `Need ${n} players`,
  doneTitle: 'Done!',
  waitingOthers: 'Waiting for the others…',
  promptOf: (i, n) => `Prompt ${i} of ${n}`,
  charsLeft: (n) => `${n} characters left`,
  submit: 'Submit',
  votesSent: 'Votes sent!',
  pickUpTo: (max, n) => `Pick up to ${max} favorites (${n} chosen)`,
  yoursSuffix: ' (yours)',
  sendVotes: 'Send votes',
  vip: 'VIP',
  playAgain: 'Play again',
  skipTimer: 'Skip timer',
  skipMatchup: 'Skip matchup',
  endGame: 'End game',
  confirmEnd: 'End the game now?',
};

const da: Strings = {
  lang: 'da-DK',
  soundOn: '🔊 Lyd til',
  soundOff: '🔇 Lyd fra',
  connectingBroker: 'Forbinder til PeerJS-serveren…',
  reconnectingBroker: 'Forbinder igen… (det gamle rum kan tage op til et minut at frigive)',
  musicHint: '🎵 Klik et vilkårligt sted for at slå lobbymusikken til',
  pausedTitle: 'Pause',
  pausedText: 'Færre end 3 spillere er forbundet. Vi venter på, at nogen kommer tilbage, eller VIP’en kan afslutte spillet.',
  round: (n) => `Runde ${n}`,
  roundScores: (n) => `Runde ${n}: stillingen`,
  finalRound: 'Finalerunden',
  gameOver: 'Spillet er slut',
  room: 'Rum',
  writeAnswers: 'Skriv dine svar på din telefon!',
  matchup: (i, n) => `Duel ${i} af ${n}`,
  votes: (n) => `${n} stemme${n === 1 ? '' : 'r'}`,
  cleanSweep: 'TOTAL SEJR!',
  voteOnPhone: 'Stem på din telefon!',
  finalScores: 'Slutstilling',
  scores: 'Stillingen',
  playAgainHint: 'VIP’en kan vælge “Spil igen” på sin telefon.',
  finalEveryone: 'Alle svarer på den her. Skriv dit svar på din telefon!',
  finalPick: 'Hver spiller vælger op til 3 favoritter på sin telefon.',
  joinOnPhone: 'Deltag på din telefon',
  qrAlt: (code) => `QR-kode til at deltage i rum ${code}`,
  players: (n) => `Spillere (${n}/12)`,
  vipCanStart: (name) => `${name} (VIP) kan starte spillet fra sin telefon.`,
  needMore: (min, name) => `Der skal mindst være ${min} spillere. ${name} er VIP.`,
  waitingFirst: 'Venter på den første spiller…',
  promptCount: (n) => `Spørgsmål skrevet af spillerne: ${n}`,
  rejected: {
    started: 'Spillet er allerede i gang. Man kan kun deltage i lobbyen.',
    full: 'Rummet er fuldt (maks. 12 spillere).',
    unknown: 'Værten kender dig ikke længere. Deltag igen.',
  },
  cantConnect: 'Kan du ikke forbinde? Join værtens Wi-Fi',
  roomTitle: (code) => `Rum ${code}`,
  connecting: 'Forbinder…',
  reconnecting: 'Forbinder igen…',
  pausedBanner: 'Pause: færre end 3 spillere er forbundet.',
  pickAvatar: 'Vælg din avatar',
  yourName: 'Dit navn',
  join: 'Deltag',
  yoursTitle: 'Den her er din!',
  yoursText: 'De andre stemmer på dit svar.',
  voteSaved: 'Stemme gemt. Du kan ændre den, indtil tiden er gået.',
  results: 'Resultat',
  finalResultsTitle: 'Slutresultat',
  lookBigScreen: 'Se på den store skærm!',
  inTitle: 'Du er med!',
  lobbyInfo: (n, max) =>
    `${n} spiller${n === 1 ? '' : 'e'} indtil videre. Tilføj op til ${max} spørgsmål, som de andre kan svare på (valgfrit).`,
  promptPlaceholder: 'fx Det værste navn til en slange',
  addPrompt: 'Tilføj spørgsmål',
  youAreVip: 'Du er VIP.',
  startGame: 'Start spillet',
  needPlayers: (n) => `Der skal være ${n} spillere`,
  doneTitle: 'Færdig!',
  waitingOthers: 'Venter på de andre…',
  promptOf: (i, n) => `Spørgsmål ${i} af ${n}`,
  charsLeft: (n) => `${n} tegn tilbage`,
  submit: 'Send',
  votesSent: 'Stemmer sendt!',
  pickUpTo: (max, n) => `Vælg op til ${max} favoritter (${n} valgt)`,
  yoursSuffix: ' (dit)',
  sendVotes: 'Send stemmer',
  vip: 'VIP',
  playAgain: 'Spil igen',
  skipTimer: 'Spring timer over',
  skipMatchup: 'Spring duel over',
  endGame: 'Afslut spillet',
  confirmEnd: 'Afslut spillet nu?',
};

export const STRINGS: Record<ThemeId, Strings> = { default: en, lars: da };
