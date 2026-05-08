export function speakKittenLine(text: string): boolean {
  const line = text.trim();
  if (!line || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return false;

  const utterance = new SpeechSynthesisUtterance(line);
  utterance.lang = "zh-CN";
  utterance.rate = 0.92;
  utterance.pitch = 1.28;
  utterance.volume = 0.95;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
