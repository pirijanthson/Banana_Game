import bananaMusic from "../assets/banana.mp3?url";

export function createBackgroundMusic(initialVolume) {
  const audio = new Audio(bananaMusic);
  audio.loop = true;
  audio.preload = "auto";

  const volume = Number(initialVolume);
  audio.volume = Number.isFinite(volume)
    ? Math.min(100, Math.max(0, volume)) / 100
    : 0;

  let isStopped = false;

  return {
    async start() {
      if (isStopped) return;
      await audio.play();
    },
    setVolume(volume) {
      if (isStopped) return;
      const value = Number(volume);
      audio.volume = Number.isFinite(value)
        ? Math.min(100, Math.max(0, value)) / 100
        : 0;
    },
    stop() {
      if (isStopped) return;
      isStopped = true;
      audio.pause();
      audio.currentTime = 0;
    },
  };
}
