const MELODY = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];
const BASS = [130.81, 146.83];
const NOTE_INTERVAL_MS = 480;

export function createBackgroundMusic(initialVolume) {
  const AudioContextConstructor =
    window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }

  let audioContext;
  try {
    audioContext = new AudioContextConstructor();
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(
      (Number(initialVolume) / 100) * 0.08,
      audioContext.currentTime,
    );
    masterGain.connect(audioContext.destination);

    let intervalId = null;
    let noteIndex = 0;
    let isStopped = false;

    const playNote = (frequency, duration, level) => {
      const startTime = audioContext.currentTime + 0.02;
      const oscillator = audioContext.createOscillator();
      const envelope = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startTime);
      envelope.gain.setValueAtTime(0.0001, startTime);
      envelope.gain.exponentialRampToValueAtTime(level, startTime + 0.08);
      envelope.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + duration,
      );
      oscillator.connect(envelope);
      envelope.connect(masterGain);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
      };
      oscillator.start(startTime);
      oscillator.stop(startTime + duration + 0.02);
    };

    return {
      async start() {
        await audioContext.resume();
        if (isStopped) {
          return;
        }

        const playNextNote = () => {
          if (isStopped || audioContext.state !== "running") {
            return;
          }
          playNote(MELODY[noteIndex % MELODY.length], 0.42, 0.16);
          if (noteIndex % 4 === 0) {
            playNote(BASS[Math.floor(noteIndex / 4) % BASS.length], 1.7, 0.08);
          }
          noteIndex += 1;
        };

        playNextNote();
        intervalId = window.setInterval(playNextNote, NOTE_INTERVAL_MS);
      },
      setVolume(volume) {
        if (!isStopped && audioContext.state !== "closed") {
          masterGain.gain.setTargetAtTime(
            (Number(volume) / 100) * 0.08,
            audioContext.currentTime,
            0.08,
          );
        }
      },
      stop() {
        if (isStopped) {
          return;
        }
        isStopped = true;
        window.clearInterval(intervalId);
        if (audioContext.state !== "closed") {
          audioContext.close().catch((error) => {
            console.warn("Unable to stop background music:", error);
          });
        }
      },
    };
  } catch (error) {
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close().catch((closeError) => {
        console.warn("Unable to close background music:", closeError);
      });
    }
    console.warn("Unable to create background music:", error);
    return null;
  }
}
