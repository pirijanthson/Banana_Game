const SETTINGS_KEY = "bananaQuestSettings";
const DEFAULT_SETTINGS = {
  backgroundColor: "#fbfaf6",
  showAnswerFeedback: true,
  theme: "light",
  textSize: "normal",
  reduceMotion: false,
  soundEffects: false,
  timerWarnings: true,
  timerWarningSeconds: 10,
  showProgress: true,
};

const HEX_COLOR_PATTERN = /^#[\da-f]{6}$/i;
const TIMER_WARNING_THRESHOLDS = [5, 10, 15];
const DARK_BACKGROUND_COLOR = "#202229";

function normalizeSettings(settings) {
  const source = settings || {};
  return {
    backgroundColor: HEX_COLOR_PATTERN.test(source.backgroundColor)
      ? source.backgroundColor
      : DEFAULT_SETTINGS.backgroundColor,
    showAnswerFeedback:
      typeof source.showAnswerFeedback === "boolean"
        ? source.showAnswerFeedback
        : DEFAULT_SETTINGS.showAnswerFeedback,
    theme: source.theme === "dark" ? "dark" : DEFAULT_SETTINGS.theme,
    textSize: source.textSize === "large" ? "large" : DEFAULT_SETTINGS.textSize,
    reduceMotion:
      typeof source.reduceMotion === "boolean"
        ? source.reduceMotion
        : DEFAULT_SETTINGS.reduceMotion,
    soundEffects:
      typeof source.soundEffects === "boolean"
        ? source.soundEffects
        : DEFAULT_SETTINGS.soundEffects,
    timerWarnings:
      typeof source.timerWarnings === "boolean"
        ? source.timerWarnings
        : DEFAULT_SETTINGS.timerWarnings,
    timerWarningSeconds: TIMER_WARNING_THRESHOLDS.includes(
      Number(source.timerWarningSeconds),
    )
      ? Number(source.timerWarningSeconds)
      : DEFAULT_SETTINGS.timerWarningSeconds,
    showProgress:
      typeof source.showProgress === "boolean"
        ? source.showProgress
        : DEFAULT_SETTINGS.showProgress,
  };
}

export function getAppSettings() {
  try {
    const storedSettings = JSON.parse(
      window.localStorage.getItem(SETTINGS_KEY) || "{}",
    );
    return normalizeSettings(storedSettings);
  } catch {
    return normalizeSettings(DEFAULT_SETTINGS);
  }
}

export function saveAppSettings(settings) {
  const normalizedSettings = normalizeSettings(settings);
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizedSettings));
  return normalizedSettings;
}

export function getDashboardBackground(settings) {
  if (
    settings.theme === "dark" &&
    settings.backgroundColor === DEFAULT_SETTINGS.backgroundColor
  ) {
    return DARK_BACKGROUND_COLOR;
  }
  return settings.backgroundColor;
}

export { DEFAULT_SETTINGS };
