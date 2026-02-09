import { useCallback } from "react";
import { resolveClaudePath, buildClaudeArgs } from "../lib/claude-cli";
import type { ClaudeSpawnOptions } from "../lib/claude-cli";
import { usePty } from "./usePty";
import { useTerminalStore } from "../stores/terminalStore";
import { useSettingsStore } from "../stores/settingsStore";
import type { Terminal } from "@xterm/xterm";
import { platform } from "@tauri-apps/plugin-os";
import { homeDir } from "@tauri-apps/api/path";

export function useClaudeProcess() {
  const { spawnProcess, cleanup } = usePty();
  const setStatus = useTerminalStore((s) => s.setStatus);
  const setClaudePath = useTerminalStore((s) => s.setClaudePath);
  const setExitCode = useTerminalStore((s) => s.setExitCode);
  const setError = useTerminalStore((s) => s.setError);
  const reset = useTerminalStore((s) => s.reset);
  const claudeModel = useSettingsStore((s) => s.settings.claudeModel);

  const startClaude = useCallback(
    async (term: Terminal, options?: ClaudeSpawnOptions) => {
      reset();
      setStatus("starting");

      try {
        const claudePath = await resolveClaudePath();
        setClaudePath(claudePath);

        const spawnOptions: ClaudeSpawnOptions = {
          ...options,
          model: options?.model || claudeModel || undefined,
        };

        const args = buildClaudeArgs(spawnOptions);

        const os = platform();
        let cwd: string;
        try {
          cwd = await homeDir();
        } catch {
          cwd = os === "windows" ? "C:\\" : "/";
        }

        spawnProcess(claudePath, args, term, {
          cwd: options?.cwd || cwd,
          onExit: (exitCode) => {
            setStatus("exited");
            setExitCode(exitCode);
          },
        });

        setStatus("running");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus("error");
      }
    },
    [spawnProcess, reset, setStatus, setClaudePath, setExitCode, setError, claudeModel]
  );

  const startShell = useCallback(
    async (term: Terminal) => {
      reset();
      setStatus("starting");

      try {
        const os = platform();
        const shell = os === "windows" ? "powershell.exe" : "/bin/bash";
        let cwd: string;
        try {
          cwd = await homeDir();
        } catch {
          cwd = os === "windows" ? "C:\\" : "/";
        }

        spawnProcess(shell, [], term, {
          cwd,
          onExit: (exitCode) => {
            setStatus("exited");
            setExitCode(exitCode);
          },
        });

        setStatus("running");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus("error");
      }
    },
    [spawnProcess, reset, setStatus, setExitCode, setError]
  );

  const stopClaude = useCallback(() => {
    cleanup();
    setStatus("exited");
  }, [cleanup, setStatus]);

  return {
    startClaude,
    startShell,
    stopClaude,
    cleanup,
  };
}
