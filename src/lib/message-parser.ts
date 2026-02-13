/**
 * Message Parser - Parses terminal buffer into structured conversation messages
 * This enables message selection, copying, and enhanced conversation management
 */

import { terminalManager } from "./terminal-manager";

/**
 * Message types for conversation history
 */
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  rawContent?: string; // Original content with ANSI codes
}

/**
 * Message Boundary Detection - Enhanced version with better pattern matching
 * Detects message boundaries in real-time for better message parsing
 */
export interface MessageBoundary {
  type: 'user' | 'assistant';
  lineNumber: number;
  startPosition: number;
  endPosition: number;
}

/**
 * Detect message boundaries in a line of text
 * Enhanced version with multiple pattern support
 */
export function detectMessageBoundaries(line: string, lineNumber: number): MessageBoundary | null {
  // Enhanced pattern matching for message boundaries
  const patterns = [
    { regex: /^👤\s*You:/, role: 'user' as const },
    { regex: /^🤖\s*Claude:/, role: 'assistant' as const },
    { regex: /^user:/i, role: 'user' as const },
    { regex: /^assistant:/i, role: 'assistant' as const },
    { regex: /^You:/, role: 'user' as const },
    { regex: /^Claude:/, role: 'assistant' as const }
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern.regex);
    if (match) {
      const startPosition = match.index || 0;
      const endPosition = startPosition + match[0].length;
      
      return {
        type: pattern.role,
        lineNumber,
        startPosition,
        endPosition
      };
    }
  }
  
  return null;
}

/**
 * Parse the current terminal buffer into conversation messages
 * Enhanced version with real-time message tracking and metadata storage
 */
export function parseTerminalMessages(): Message[] {
  const messages: Message[] = [];
  const term = terminalManager.term;
  
  if (!term) return messages;
  
  // Get all lines from the terminal buffer
  const buffer = term.buffer.active;
  const lineCount = buffer.length;
  let currentMessage: Partial<Message> | null = null;
  
  for (let i = 0; i < lineCount; i++) {
    const line = buffer.getLine(i);
    const lineText = line?.translateToString(false) || ''; // Get text without ANSI
    
    // Enhanced message boundary detection
    const boundary = detectMessageBoundaries(lineText, i);
    
    if (boundary) {
      // Start new message
      currentMessage = {
        id: `msg-${Date.now()}-${i}`,
        role: boundary.type,
        content: '',
        timestamp: new Date(),
        rawContent: lineText
      };
      messages.push(currentMessage as Message);
    }
    else if (currentMessage) {
      // Continue current message
      currentMessage.content += lineText + '\n';
      currentMessage.rawContent += lineText + '\n';
    }
  }
  
  // Clean up empty messages and trim content
  return messages
    .filter(msg => msg.content.trim().length > 0)
    .map(msg => ({
      ...msg,
      content: msg.content.trim()
    }));
}

/**
 * Get the most recent message from the terminal
 * Useful for quick copy operations
 */
export function getLatestMessage(): Message | null {
  const messages = parseTerminalMessages();
  return messages.length > 0 ? messages[messages.length - 1] : null;
}

/**
 * Get message by index (for targeted copy operations)
 */
export function getMessageByIndex(index: number): Message | null {
  const messages = parseTerminalMessages();
  return index >= 0 && index < messages.length ? messages[index] : null;
}

/**
 * Extension point: Custom message parsers can be registered here
 * This allows plugins to add their own message parsing logic
 */
interface MessageParser {
  (lines: string[]): Message[] | null;
}

const customParsers: MessageParser[] = [];

/**
 * Register a custom message parser
 * @param parser Function that takes terminal lines and returns parsed messages
 */
export function registerMessageParser(parser: MessageParser) {
  customParsers.push(parser);
}

/**
 * Run all custom parsers on the current terminal content
 */
export function runCustomParsers(): Message[] {
  const term = terminalManager.term;
  if (!term) return [];
  
  const buffer = term.buffer.active;
  const lineCount = buffer.length;
  const lines: string[] = [];
  
  for (let i = 0; i < lineCount; i++) {
    const line = buffer.getLine(i);
    const lineText = line?.translateToString(false) || '';
    lines.push(lineText);
  }
  
  const results: Message[] = [];
  
  for (const parser of customParsers) {
    const parsed = parser(lines);
    if (parsed) {
      results.push(...parsed);
    }
  }
  
  return results;
}