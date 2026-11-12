import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import AppSettingsContext from "./appSettingsContext";
import {
  fetchRemoteAppSettings,
  getAppSettings,
  hasLocalAppSettings,
  clearLocalAppSettings,
  updateRemoteAppSettings,
} from "../utils/settings";

export function AppSettingsProvider({ children }) {
  const { pathname } = useLocation();
  const [settings, setSettings] = useState(getAppSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const loadedToken = useRef(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    let isCurrent = true;
    const token = window.localStorage.getItem("token");
    const requestId = ++requestVersion.current;

    if (!token) {
      loadedToken.current = null;
      window.setTimeout(() => {
        if (isCurrent) {
          setIsLoading(false);
          setLoadError("");
        }
      }, 0);
      return () => {
        isCurrent = false;
      };
    }

    if (loadedToken.current === token) {
      return () => {
        isCurrent = false;
      };
    }

    const loadingTimer = window.setTimeout(() => {
      if (isCurrent) {
        setIsLoading(true);
        setLoadError("");
      }
    }, 0);

    const loadSettings = async () => {
      try {
        const remoteSettings = await fetchRemoteAppSettings(token);
        let nextSettings = remoteSettings.settings;

        if (!remoteSettings.hasSavedSettings && hasLocalAppSettings()) {
          nextSettings = await updateRemoteAppSettings(token, getAppSettings());
          clearLocalAppSettings();
        }

        if (isCurrent && requestVersion.current === requestId) {
          loadedToken.current = token;
          setSettings(nextSettings);
          setLoadError("");
        }
      } catch (error) {
        if (isCurrent && requestVersion.current === requestId) {
          loadedToken.current = null;
          setLoadError(error.message);
        }
      } finally {
        if (isCurrent && requestVersion.current === requestId) {
          window.clearTimeout(loadingTimer);
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isCurrent = false;
      window.clearTimeout(loadingTimer);
    };
  }, [pathname]);

  const saveSettings = useCallback(async (nextSettings) => {
    const token = window.localStorage.getItem("token");
    if (!token) {
      throw new Error("Please log in to save your settings.");
    }

    const requestId = ++requestVersion.current;
    const savedSettings = await updateRemoteAppSettings(token, nextSettings);
    if (requestVersion.current === requestId) {
      setSettings(savedSettings);
      loadedToken.current = token;
      setLoadError("");
      setIsLoading(false);
    }
    return savedSettings;
  }, []);

  return (
    <AppSettingsContext.Provider
      value={{ settings, isLoading, loadError, saveSettings }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}
