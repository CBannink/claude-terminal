import { useCallback } from "react";
import { terminalManager } from "../lib/terminal-manager";
import { useSettingsStore } from "../stores/settingsStore";
import type { AppSettings } from "../types/settings";

export function useTerminal() {
  const settings = useSettingsStore((s) => s.settings);

  const init = useCallback(
    (container: HTMLDivElement) => {
      return terminalManager.init(container, settings);
    },
    [settings]
  );

  const fit = useCallback(() => {
    terminalManager.fit();
  }, []);

  const dispose = useCallback(() => {
    terminalManager.dispose();
  }, []);

  const findNext = useCallback((query: string) => {
    terminalManager.findNext(query);
  }, []);

  const findPrevious = useCallback((query: string) => {
    terminalManager.findPrevious(query);
  }, []);

  const clearSearch = useCallback(() => {
    terminalManager.clearSearch();
  }, []);

  const applySettings = useCallback((s: AppSettings) => {
    terminalManager.applySettings(s);
  }, []);

  return {
    get term() {
      return terminalManager.term;
    },
    init,
    fit,
    dispose,
    findNext,
    findPrevious,
    clearSearch,
    applySettings,
  };
}
