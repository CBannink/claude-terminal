import { themes } from "../../lib/themes";
import type { ThemeName } from "../../types/settings";

interface ThemePickerProps {
  currentTheme: ThemeName;
  onSelect: (themeId: ThemeName) => void;
}

export function ThemePicker({ currentTheme, onSelect }: ThemePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Object.entries(themes).map(([id, theme]) => (
        <button
          key={id}
          onClick={() => onSelect(id as ThemeName)}
          className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${
            currentTheme === id
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-zinc-700 hover:border-zinc-500"
          }`}
        >
          <div
            className="w-full h-8 rounded flex items-center justify-center text-xs"
            style={{
              backgroundColor: theme.background,
              color: theme.foreground,
            }}
          >
            <span style={{ color: theme.green }}>$</span>
            <span style={{ color: theme.foreground }}> hello</span>
          </div>
          <span className="text-xs text-zinc-400">{theme.name}</span>
        </button>
      ))}
    </div>
  );
}
