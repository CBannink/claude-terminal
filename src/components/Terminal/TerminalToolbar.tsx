import { useCallback } from "react";
import { terminalManager } from "../../lib/terminal-manager";
import { useClaudeProcess } from "../../hooks/useClaudeProcess";
import { useTerminalStore } from "../../stores/terminalStore";

export function TerminalToolbar() {
  const { startClaude, startShell, stopClaude, cleanup } = useClaudeProcess();
  const status = useTerminalStore((s) => s.status);
  const setSettingsOpen = useTerminalStore((s) => s.setSettingsOpen);
  const setSearchOpen = useTerminalStore((s) => s.setSearchOpen);
  const setSessionPickerOpen = useTerminalStore((s) => s.setSessionPickerOpen);
  const editorOpen = useTerminalStore((s) => s.editorOpen);
  const setEditorOpen = useTerminalStore((s) => s.setEditorOpen);

  const handleNewSession = useCallback(async () => {
    const term = terminalManager.term;
    if (!term) return;
    cleanup();
    term.clear();
    term.reset();
    await startClaude(term);
  }, [cleanup, startClaude]);

  const handleContinueSession = useCallback(async () => {
    const term = terminalManager.term;
    if (!term) return;
    cleanup();
    term.clear();
    term.reset();
    await startClaude(term, { continueSession: true });
  }, [cleanup, startClaude]);

  const handleShell = useCallback(async () => {
    const term = terminalManager.term;
    if (!term) return;
    cleanup();
    term.clear();
    term.reset();
    await startShell(term);
  }, [cleanup, startShell]);

  const handleStop = useCallback(() => {
    stopClaude();
  }, [stopClaude]);

  const handleToggleEditor = useCallback(() => {
    setEditorOpen(!editorOpen);
  }, [editorOpen, setEditorOpen]);

  const isRunning = status === "running" || status === "starting";

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
      <button
        onClick={handleNewSession}
        disabled={isRunning}
        className="px-3 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        New Session
      </button>
      <button
        onClick={handleContinueSession}
        disabled={isRunning}
        className="px-3 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Continue Last
      </button>
      <button
        onClick={() => setSessionPickerOpen(true)}
        disabled={isRunning}
        className="px-3 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Resume...
      </button>
      <button
        onClick={handleShell}
        disabled={isRunning}
        className="px-3 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Shell
      </button>
      {isRunning && (
        <button
          onClick={handleStop}
          className="px-3 py-1 text-xs rounded bg-red-700 hover:bg-red-600 text-white transition-colors"
        >
          Stop
        </button>
      )}

      <div className="flex-1" />

      <button
        onClick={handleToggleEditor}
        className="px-3 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
        title="Editor Mode (Ctrl+E)"
      >
        {editorOpen ? "Close Editor" : "Editor Mode"}
      </button>

      <button
        onClick={() => setSearchOpen(true)}
        className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
        title="Search (Ctrl+Shift+F)"
      >
        Search
      </button>
      <button
        onClick={() => setSettingsOpen(true)}
        className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
        title="Settings (Ctrl+,)"
      >
        Settings
      </button>
    </div>
  );
}
