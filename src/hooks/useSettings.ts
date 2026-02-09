import { useEffect, useCallback, useRef } from "react";
import { load } from "@tauri-apps/plugin-store";
import { useSettingsStore } from "../stores/settingsStore";
import type { AppSettings } from "../types/settings";
import { DEFAULT_SETTINGS } from "../types/settings";
import { STORE_FILE } from "../lib/constants";
import { log } from "../lib/logger";

let storePromise: ReturnType<typeof load> | null = null;

function getStore() {
  if (!storePromise) {
    storePromise = load(STORE_FILE, { defaults: {}, autoSave: true });
    // Clear cache on failure so next attempt retries
    storePromise.catch(() => {
      storePromise = null;
    });
  }
  return storePromise;
}

export function useSettings() {
  const { settings, loaded, setSettings, loadSettings } = useSettingsStore();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loaded) return;

    (async () => {
      try {
        log("info", "useSettings: loading store");
        const store = await getStore();
        const saved = await store.get<AppSettings>("settings");
        if (saved) {
          log("info", "useSettings: loaded saved settings");
          loadSettings({ ...DEFAULT_SETTINGS, ...saved });
        } else {
          log("info", "useSettings: no saved settings, using defaults");
          loadSettings(DEFAULT_SETTINGS);
        }
      } catch (err) {
        log("error", `useSettings: failed to load: ${err}`);
        loadSettings(DEFAULT_SETTINGS);
      }
    })();
  }, [loaded, loadSettings]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<AppSettings>) => {
      setSettings(partial);

      // Debounce persistence to avoid race conditions with rapid updates
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          const store = await getStore();
          const current = useSettingsStore.getState().settings;
          await store.set("settings", current);
          log("info", "useSettings: persisted settings");
        } catch (err) {
          log("error", `useSettings: failed to persist: ${err}`);
        }
      }, 300);
    },
    [setSettings]
  );

  return { settings, loaded, updateSettings };
}
