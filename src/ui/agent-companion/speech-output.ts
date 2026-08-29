export interface SpeechOutputService {
  speak(text: string, rate: number): void;
  cancel(): void;
}

export const browserSpeechOutput: SpeechOutputService = {
  speak(text: string, rate: number) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Fallback gracefully in unsupported or restricted browser environments
      }
    }
  },
  cancel() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Fallback gracefully
      }
    }
  },
};
