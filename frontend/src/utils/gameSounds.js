export function playGameSound(result, volumeLevel = 100) {
  const normalizedVolume = Number(volumeLevel);
  if (!Number.isFinite(normalizedVolume) || normalizedVolume <= 0) {
    return;
  }

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return;
  }

  let audioContext;
  try {
    audioContext = new AudioContextConstructor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const isCorrect = result === "CORRECT";

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(isCorrect ? 660 : 280, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      isCorrect ? 880 : 180,
      now + 0.12,
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      0.12 * Math.min(normalizedVolume, 100) / 100,
      now + 0.015,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
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
