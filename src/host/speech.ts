/** Browser text-to-speech for the host screen. */
export function speak(lines: string[]) {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  for (const line of lines) speechSynthesis.speak(new SpeechSynthesisUtterance(line));
}

export function stopSpeaking() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}
