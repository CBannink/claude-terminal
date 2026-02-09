import { useEffect, useCallback, useRef } from "react";
import { load } from "@tauri-apps/plugin-store";
import { useSettingsStore } from "../stores/settingsStore";
import type { AppSettings } from "../types/settings";
import { DEFAULT_SETTINGS } from "../types/settings";
import { STORE_FILE } from "../lib/constants";

let storePromise: ReturnType<typeof load> | null = null;

function getStore() {
  if (!storePromise) {
    storePromise = load(STORE_FILE, { defaults: {}, autoSave: true });
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
        const store = await getStore();
        const saved = await store.get<AppSettings>("settings");
        if (saved) {
          loadSettings({ ...DEFAULT_SETTINGS, ...saved });
        } else {
          loadSettings(DEFAULT_SETTINGS);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
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
        } catch (err) {
          console.error("Failed to persist settings:", err);
        }
      }, 300);
    },
    [setSettings]
  );

  return { settings, loaded, updateSettings };
}
