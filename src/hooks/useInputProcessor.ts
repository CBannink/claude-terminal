import { useCallback } from "react";
import { terminalManager } from "../lib/terminal-manager";
import { usePty } from "./usePty";
import { useTerminalStore } from "../stores/terminalStore";

/**
 * Input Processor Hook
 * Handles routing input from both terminal and editor to both display and PTY
 */
export function useInputProcessor() {
  const pty = usePty();

  /**
   * Send input to terminal display
   */
  const sendToTerminal = useCallback((data: string) => {
    terminalManager.term?.write(data);
  }, []);

  /**
   * Send input to PTY process
   */
  const sendToPTY = useCallback((data: string) => {
    pty.write(data);
  }, [pty]);

  /**
   * Process input from any source
   * @param input The input string to process
   * @param source The source of the input ('terminal' or 'editor')
   */
  const processInput = useCallback((input: string, source: 'terminal' | 'editor') => {
    // Format for display based on source
    const displayInput = source === 'editor'
      ? `\r\n👤 You: ${input}\r\n`
      : input;

    // Send to terminal display
    sendToTerminal(displayInput);
    
    // Send to PTY process with newline for execution
    sendToPTY(input + '\r');
  }, [sendToTerminal, sendToPTY]);

  return { processInput };
}