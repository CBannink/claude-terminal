import { useEffect, useCallback } from "react";
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
      } catch {
        loadSettings(DEFAULT_SETTINGS);
      }
    })();
  }, [loaded, loadSettings]);

  const updateSettings = useCallback(
    async (partial: Partial<AppSettings>) => {
      setSettings(partial);
      try {
        const store = await getStore();
        const current = useSettingsStore.getState().settings;
        await store.set("settings", current);
      } catch {
        // Settings save failed, will retry on next update
      }
    },
    [setSettings]
  );

  return { settings, loaded, updateSettings };
}
