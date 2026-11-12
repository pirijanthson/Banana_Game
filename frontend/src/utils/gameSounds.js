export function playGameSound(result) {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return;
  }

  let audioContext;
  try {
    audioContext = new AudioContextConstructor();
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    const now = audioContext.currentTime;
    const isCorrect = result === "CORRECT";

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(isCorrect ? 660 : 280, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      isCorrect ? 880 : 180,
      now + 0.12,
    );
    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(volume);
    volume.connect(audioContext.destination);
    oscillator.onended = () => {
      audioContext.close().catch((error) => {
        console.warn("Unable to close the game audio context:", error);
      });
    };

    if (audioContext.state === "suspended") {
      audioContext.resume().catch((error) => {
        console.warn("Unable to start game audio:", error);
      });
    }

    oscillator.start(now);
    oscillator.stop(now + 0.17);
  } catch (error) {
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close().catch((closeError) => {
        console.warn("Unable to close the game audio context:", closeError);
      });
    }
    console.warn("Unable to play the game sound:", error);
  }
}
