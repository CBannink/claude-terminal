import { invoke } from '@tauri-apps/api/tauri';
import { terminalManager } from './terminal-manager';

/**
 * CLI Service
 * Provides direct command execution bypassing terminal emulation
 */
export class CLIService {
  /**
   * Execute a command via the Claude CLI
   * @param command The command to execute
   * @param model The Claude model to use
   * @returns Promise that resolves with the command output
   */
  static async executeCommand(command: string, model: string = 'claude-3-opus-20240229'): Promise<string> {
    try {
      // Display the command in the terminal for visual feedback
      const term = terminalManager.term;
      if (term) {
        term.write(`\r\n👤 You: ${command}\r\n`);
      }

      // Construct the full Claude CLI command
      const fullCommand = `claude ${command} --model ${model}`;

      // Execute the command via Tauri
      const output = await invoke('execute_command', { command: fullCommand });
      
      // Display the output in the terminal
      if (term) {
        term.write(`\r\n🤖 Claude: ${output}\r\n`);
      }
      
      return output;
    } catch (error) {
      console.error('Command execution failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Display the error in the terminal
      const term = terminalManager.term;
      if (term) {
        term.write(`\r\n❌ Error: ${errorMessage}\r\n`);
      }
      
      return `Error: ${errorMessage}`;
    }
  }
}