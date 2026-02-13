import { create } from "zustand";
import type { SessionStatus } from "../types/terminal";

interface TerminalState {
  status: SessionStatus;
  claudePath: string | null;
  sessionId: string | null;
  model: string | null;
  exitCode: number | null;
  error: string | null;
  searchOpen: boolean;
  settingsOpen: boolean;
  sessionPickerOpen: boolean;
  inputMode: "terminal" | "editor";
  editorBuffer: string;
  editorOpen: boolean;

  setStatus: (status: SessionStatus) => void;
  setClaudePath: (path: string | null) => void;
  setSessionId: (id: string | null) => void;
  setModel: (model: string | null) => void;
  setExitCode: (code: number | null) => void;
  setError: (error: string | null) => void;
  setSearchOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setSessionPickerOpen: (open: boolean) => void;
  setInputMode: (mode: "terminal" | "editor") => void;
  setEditorBuffer: (content: string) => void;
  setEditorOpen: (open: boolean) => void;
  clearEditorBuffer: () => void;
  reset: () => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  status: "idle",
  claudePath: null,
  sessionId: null,
  model: null,
  exitCode: null,
  error: null,
  searchOpen: false,
  settingsOpen: false,
  sessionPickerOpen: false,
  inputMode: "terminal",
  editorBuffer: "",
  editorOpen: false,

  setStatus: (status) => set({ status }),
  setClaudePath: (claudePath) => set({ claudePath }),
  setSessionId: (sessionId) => set({ sessionId }),
  setModel: (model) => set({ model }),
  setExitCode: (exitCode) => set({ exitCode }),
  setError: (error) => set({ error }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setSessionPickerOpen: (sessionPickerOpen) => set({ sessionPickerOpen }),
  setInputMode: (inputMode) => set({ inputMode }),
  setEditorBuffer: (editorBuffer) => set({ editorBuffer }),
  setEditorOpen: (editorOpen) =>
    set({
      editorOpen,
      inputMode: editorOpen ? "editor" : "terminal",
    }),
  clearEditorBuffer: () => set({ editorBuffer: "" }),
  reset: () =>
    set({
      status: "idle",
      claudePath: null,
      sessionId: null,
      model: null,
      exitCode: null,
      error: null,
    }),
}));
