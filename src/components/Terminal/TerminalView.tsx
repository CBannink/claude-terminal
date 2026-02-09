import { useEffect, useRef, useCallback } from "react";
import { terminalManager } from "../../lib/terminal-manager";
import { useClaudeProcess } from "../../hooks/useClaudeProcess";
import { useWindowResize } from "../../hooks/useWindowResize";
import { useTerminalStore } from "../../stores/terminalStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { themes } from "../../lib/themes";
import "@xterm/xterm/css/xterm.css";

export function TerminalView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { startClaude } = useClaudeProcess();
  const status = useTerminalStore((s) => s.status);
  const error = useTerminalStore((s) => s.error);
  const settings = useSettingsStore((s) => s.settings);
  const initializedRef = useRef(false);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const term = terminalManager.init(containerRef.current, settings);

    // Wait for terminal to have correct dimensions before spawning PTY
    terminalManager.whenReady().then(() => startClaude(term)).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      term.writeln("");
      if (message.toLowerCase().includes("not found")) {
        term.writeln("  \x1b[1;33mClaude CLI not found\x1b[0m");
        term.writeln("");
        term.writeln("  Install Claude Code:");
        term.writeln("    \x1b[36mnpm install -g @anthropic-ai/claude-code\x1b[0m");
      } else {
        term.writeln(`  \x1b[1;31mFailed to start Claude: ${message}\x1b[0m`);
      }
      term.writeln("");
      term.writeln("  Or press \x1b[1mShell\x1b[0m in the toolbar to open a regular terminal.");
      term.writeln("");
    });

    return () => {
      terminalManager.dispose();
      initializedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle resize
  const handleResize = useCallback(() => {
    terminalManager.fit();
  }, []);

  useWindowResize(handleResize);

  // Apply theme/font changes
  useEffect(() => {
    terminalManager.applySettings(settings);
  }, [settings]);

  const bg = (themes[settings.theme] || themes.dark).background;

  return (
    <div className="flex-1 relative overflow-hidden">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ padding: "4px", backgroundColor: bg }}
      />
      {status === "exited" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800/90 text-zinc-300 px-4 py-2 rounded-lg text-sm backdrop-blur border border-zinc-700">
          Process exited. Use the toolbar to start a new session.
        </div>
      )}
      {status === "error" && error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-200 px-4 py-2 rounded-lg text-sm backdrop-blur border border-red-800 max-w-lg text-center">
          {error}
        </div>
      )}
    </div>
  );
}
