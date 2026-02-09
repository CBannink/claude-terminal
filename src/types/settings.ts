export type ThemeName = "dark" | "light" | "monokai" | "dracula" | "tokyoNight" | "catppuccin";

export interface TerminalTheme {
  name: string;
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface AppSettings {
  theme: ThemeName;
  fontFamily: string;
  fontSize: number;
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
  scrollback: number;
  claudeModel: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
  fontSize: 14,
  cursorStyle: "block",
  cursorBlink: true,
  scrollback: 5000,
  claudeModel: "",
};
