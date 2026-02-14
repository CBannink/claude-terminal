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
   * @returns Promise that resolves with the command output or error
   */
  static async executeCommand(command: string, model: string = 'claude-3-opus-20240229'): Promise<{ success: boolean, output: string }> {
    try {
      // Display the command in the terminal for visual feedback
      const term = terminalManager.term;
      if (term) {
        term.write(`\r\n👤 You: ${command}\r\n`);
      }

      // Sanitize the command to prevent injection
      if (!isSafeCommand(command)) {
        const errorMsg = 'Command contains forbidden characters or patterns';
        if (term) {
          term.write(`\r\n❌ Error: ${errorMsg}\r\n`);
        }
        return { success: false, output: errorMsg };
      }

      // Construct the full Claude CLI command
      const fullCommand = `claude ${command} --model ${model}`;

      // Execute the command via Tauri
      const output = await invoke('execute_command', { command: fullCommand });
      
      // Display the output in the terminal
      if (term) {
        term.write(`\r\n🤖 Claude: ${output}\r\n`);
      }
      
      return { success: true, output };
    } catch (error) {
      console.error('Command execution failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Display the error in the terminal
      const term = terminalManager.term;
      if (term) {
        term.write(`\r\n❌ Error: ${errorMessage}\r\n`);
      }
      
      return { success: false, output: `Error: ${errorMessage}` };
    }
  }
}

/**
 * Check if a command is safe to execute
 * @param command The command to check
 * @returns True if the command is safe, false otherwise
 */
function isSafeCommand(command: string): boolean {
  // Check for potentially dangerous characters
  const dangerousPatterns = [
    '&', '|', ';', '$', '`', '<', '>', '\\', '/', '~', '\\\\', '"', "'",
  ];
  
  for (const pattern of dangerousPatterns) {
    if (command.includes(pattern)) {
      return false;
    }
  }
  
  // Check for absolute paths
  if (command.startsWith('/') || command.startsWith('\\\\') || command.includes(':\\\\')) {
    return false;
  }
  
  // Check for command chaining
  const chainRegex = /\s+&&\s+|\s+\|\s+|\s+;\s+/;
  if (chainRegex.test(command)) {
    return false;
  }
  
  return true;
}