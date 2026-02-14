import { useRef, useCallback } from "react";
import { spawn } from "tauri-pty";
import type { Terminal } from "@xterm/xterm";
import { CLAUDE_ENV } from "../lib/constants";
import { log } from "../lib/logger";
import { useTerminalStore } from "../stores/terminalStore";

interface PtyInstance {
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
  onData: (cb: (data: Uint8Array) => void) => { dispose: () => void };
  onExit: (cb: (exit: { exitCode: number; signal?: number }) => void) => { dispose: () => void };
}

export function usePty() {
  const ptyRef = useRef<PtyInstance | null>(null);
  const disposablesRef = useRef<Array<{ dispose: () => void }>>([]);

  const cleanup = useCallback(() => {
    for (const d of disposablesRef.current) {
      d.dispose();
    }
    disposablesRef.current = [];

    if (ptyRef.current) {
      try {
        ptyRef.current.kill();
      } catch {
        // Already dead
      }
      ptyRef.current = null;
    }
  }, []);

  const spawnProcess = useCallback(
    (
      command: string,
      args: string[],
      term: Terminal,
      options?: {
        cwd?: string;
        env?: Record<string, string>;
        onExit?: (exitCode: number) => void;
      }
    ) => {
      // Clean up existing PTY
      cleanup();

      const env: Record<string, string> = {
        ...CLAUDE_ENV,
        ...options?.env,
      };

      log("info", `usePty.spawn: ${command} [${args.join(", ")}]`);
      let pty: PtyInstance;
      try {
        pty = spawn(command, args, {
          cols: term.cols,
          rows: term.rows,
          cwd: options?.cwd,
          env,
        }) as unknown as PtyInstance;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to spawn process "${command}": ${message}`);
      }

      ptyRef.current = pty;

      // PTY → Terminal
      const dataDisposable = pty.onData((data: Uint8Array) => {
        term.write(data);
      });
      disposablesRef.current.push(dataDisposable);

      // Terminal → PTY
      // Note: inputMode is checked synchronously on every keystroke.
      // Switching modes while typing is safe because Zustand updates are synchronous,
      // but UI should only allow mode switching when terminal is idle for best UX.
      const inputDisposable = term.onData((data: string) => {
        const { inputMode, isEnhancedMode, editorOpen } = useTerminalStore.getState();
        
        // In enhanced mode, we handle input through the enhanced editor
        // but we still need to allow programmatic input (like from handleSend)
        // We check editorOpen instead of isEnhancedMode to allow input when editor is closed
        if (inputMode === "terminal" || !editorOpen) {
          pty.write(data);
        }
      });
      disposablesRef.current.push(inputDisposable);

      // Terminal resize → PTY resize
      const resizeDisposable = term.onResize(({ cols, rows }) => {
        pty.resize(cols, rows);
      });
      disposablesRef.current.push(resizeDisposable);

      // PTY exit
      const exitDisposable = pty.onExit(({ exitCode }) => {
        options?.onExit?.(exitCode);
      });
      disposablesRef.current.push(exitDisposable);

      return pty;
    },
    [cleanup]
  );

  const write = useCallback((data: string) => {
    ptyRef.current?.write(data);
  }, []);

  const resize = useCallback((cols: number, rows: number) => {
    ptyRef.current?.resize(cols, rows);
  }, []);

  return {
    ptyRef,
    spawnProcess,
    cleanup,
    write,
    resize,
  };
}
