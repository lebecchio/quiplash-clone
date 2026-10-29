/** Browser text-to-speech for the host screen. */
export function speak(lines: string[], lang?: string) {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  for (const line of lines) {
    const u = new SpeechSynthesisUtterance(line);
    if (lang) u.lang = lang;
    speechSynthesis.speak(u);
  }
}

export function stopSpeaking() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}
