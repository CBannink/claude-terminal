import { useCallback } from "react";
import { useSettings } from "../../hooks/useSettings";
import { useTerminalStore } from "../../stores/terminalStore";
import { ThemePicker } from "./ThemePicker";
import type { AppSettings } from "../../types/settings";

export function SettingsDialog() {
  const { settings, updateSettings } = useSettings();
  const setSettingsOpen = useTerminalStore((s) => s.setSettingsOpen);

  const handleClose = useCallback(() => {
    setSettingsOpen(false);
  }, [setSettingsOpen]);

  const handleUpdate = useCallback(
    (partial: Partial<AppSettings>) => {
      updateSettings(partial);
    },
    [updateSettings]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-[480px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200">Settings</h2>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Theme */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Theme</label>
            <ThemePicker
              currentTheme={settings.theme}
              onSelect={(theme) => handleUpdate({ theme })}
            />
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Font Family</label>
            <input
              type="text"
              value={settings.fontFamily}
              onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Font Size: {settings.fontSize}px
            </label>
            <input
              type="range"
              min={10}
              max={24}
              value={settings.fontSize}
              onChange={(e) => handleUpdate({ fontSize: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Cursor Style */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Cursor Style</label>
            <div className="flex gap-2">
              {(["block", "underline", "bar"] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => handleUpdate({ cursorStyle: style })}
                  className={`px-3 py-1 text-xs rounded border transition-colors ${
                    settings.cursorStyle === style
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Cursor Blink */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-400">Cursor Blink</label>
            <button
              onClick={() => handleUpdate({ cursorBlink: !settings.cursorBlink })}
              className={`w-10 h-5 rounded-full transition-colors ${
                settings.cursorBlink ? "bg-indigo-600" : "bg-zinc-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  settings.cursorBlink ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Scrollback */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Scrollback Lines: {settings.scrollback.toLocaleString()}
            </label>
            <input
              type="range"
              min={1000}
              max={50000}
              step={1000}
              value={settings.scrollback}
              onChange={(e) => handleUpdate({ scrollback: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Claude Model */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Claude Model (optional)</label>
            <input
              type="text"
              value={settings.claudeModel}
              onChange={(e) => handleUpdate({ claudeModel: e.target.value })}
              placeholder="e.g. claude-sonnet-4-5-20250929"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors placeholder-zinc-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
