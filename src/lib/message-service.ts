/**
 * Message Service - Centralized service for message operations
 * Handles parsing, copying, selection, and extension management
 */

import { Message, CopyOptions } from "../types/messages";
import { parseTerminalMessages, getLatestMessage, getMessageByIndex, registerMessageParser, runCustomParsers } from "./message-parser";

/**
 * Message Service Class - Singleton service for message operations
 */
export class MessageService {
  private static instance: MessageService;
  
  // Message cache for performance
  private messageCache: Message[] = [];
  private cacheValid = false;
  
  // Extension points
  private beforeCopyHooks: ((message: Message) => Message)[] = [];
  private afterCopyHooks: ((copiedText: string) => string)[] = [];
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }
  
  /**
   * Get all messages from the terminal
   * Uses caching for better performance
   */
  public getAllMessages(forceRefresh = false): Message[] {
    if (!this.cacheValid || forceRefresh) {
      this.messageCache = parseTerminalMessages();
      this.cacheValid = true;
    }
    return [...this.messageCache];
  }
  
  /**
   * Get the latest message
   */
  public getLatest(): Message | null {
    return getLatestMessage();
  }
  
  /**
   * Get message by index
   */
  public getByIndex(index: number): Message | null {
    return getMessageByIndex(index);
  }
  
  /**
   * Copy message to clipboard
   * @param message Message to copy
   * @param options Copy options
   */
  public async copyMessage(message: Message, options: CopyOptions = {}): Promise<boolean> {
    try {
      // Apply before-copy hooks
      let processedMessage = message;
      for (const hook of this.beforeCopyHooks) {
        processedMessage = hook(processedMessage);
      }
      
      // Format the message
      const formatted = this.formatMessage(processedMessage, options);
      
      // Apply after-copy hooks
      let finalText = formatted;
      for (const hook of this.afterCopyHooks) {
        finalText = hook(finalText);
      }
      
      // Copy to clipboard
      await navigator.clipboard.writeText(finalText);
      return true;
    } catch (error) {
      console.error("Failed to copy message:", error);
      return false;
    }
  }
  
  /**
   * Copy message using keyboard shortcut (Ctrl+C)
   * @param message Message to copy
   * @param options Copy options
   */
  public async copyMessageWithShortcut(message: Message, options: CopyOptions = {}): Promise<boolean> {
    return this.copyMessage(message, options);
  }
  
  /**
   * Setup context menu integration for message copying
   * This would be called during initialization to set up context menu handlers
   */
  public setupContextMenuIntegration(): void {
    // In a real implementation, this would set up event listeners
    // for context menu events on the terminal overlay
    console.log("Context menu integration setup");
    
    // Example: Add event listener for context menu
    // document.addEventListener('contextmenu', this.handleContextMenu);
  }
  
  /**
   * Handle context menu event for message copying
   * @param event Mouse event
   * @param message Message at the context menu location
   */
  public handleContextMenu(event: MouseEvent, message: Message | null): void {
    if (!message) return;
    
    event.preventDefault();
    
    // In a real implementation, we would show a custom context menu
    // For now, we'll just copy the message
    this.copyMessage(message);
    
    // Show feedback to user
    console.log(`Copied ${message.role} message to clipboard`);
  }
  
  /**
   * Copy the latest message
   */
  public async copyLatest(options: CopyOptions = {}): Promise<boolean> {
    const latest = this.getLatest();
    return latest ? this.copyMessage(latest, options) : false;
  }
  
  /**
   * Format a message for copying
   */
  private formatMessage(message: Message, options: CopyOptions = {}): string {
    const {
      includeTimestamps = false,
      includeRoles = true,
      asMarkdown = false,
      includeRaw = false,
      format
    } = options;
    
    if (format) {
      return format(message);
    }
    
    let result = '';
    
    // Add timestamp if requested
    if (includeTimestamps) {
      result += `[${message.timestamp.toLocaleTimeString()}] `;
    }
    
    // Add role indicator if requested
    if (includeRoles) {
      const roleIndicator = message.role === 'user' ? '👤 You:' : '🤖 Claude:';
      result += `${roleIndicator} `;
    }
    
    // Add content
    const content = includeRaw && message.rawContent 
      ? message.rawContent 
      : message.content;
    
    if (asMarkdown) {
      // Simple markdown formatting
      result += content;
    } else {
      result += content;
    }
    
    return result.trim();
  }
  
  /**
   * Invalidate message cache (call when terminal content changes)
   */
  public invalidateCache(): void {
    this.cacheValid = false;
  }
  
  /**
   * Register a before-copy hook
   * Allows extensions to modify messages before copying
   */
  public registerBeforeCopyHook(hook: (message: Message) => Message): void {
    this.beforeCopyHooks.push(hook);
  }
  
  /**
   * Register an after-copy hook
   * Allows extensions to modify copied text
   */
  public registerAfterCopyHook(hook: (copiedText: string) => string): void {
    this.afterCopyHooks.push(hook);
  }
  
  /**
   * Register a custom message parser
   * Delegates to the message-parser module
   */
  public registerParser(parser: (lines: string[]) => Message[] | null): void {
    registerMessageParser(parser);
  }
  
  /**
   * Run custom parsers
   */
  public runCustomParsers(): Message[] {
    return runCustomParsers();
  }
  
  /**
   * Get message count statistics
   */
  public getStatistics(): {
    total: number;
    user: number;
    assistant: number;
    system: number;
  } {
    const messages = this.getAllMessages();
    
    return {
      total: messages.length,
      user: messages.filter(m => m.role === 'user').length,
      assistant: messages.filter(m => m.role === 'assistant').length,
      system: messages.filter(m => m.role === 'system').length
    };
  }
  
  /**
   * Clear all hooks and extensions
   * Useful for testing or reset
   */
  public clearExtensions(): void {
    this.beforeCopyHooks = [];
    this.afterCopyHooks = [];
  }
}

/**
 * Singleton instance of the message service
 */
export const messageService = MessageService.getInstance();

/**
 * Extension point: Register message service extensions
 * This allows plugins to extend message functionality
 */
export interface MessageServiceExtension {
  name: string;
  initialize: (service: MessageService) => void;
  cleanup?: () => void;
}

const extensions: MessageServiceExtension[] = [];

/**
 * Register a message service extension
 */
export function registerMessageServiceExtension(extension: MessageServiceExtension): void {
  extensions.push(extension);
  extension.initialize(messageService);
}

/**
 * Initialize all registered extensions
 */
export function initializeMessageExtensions(): void {
  for (const extension of extensions) {
    try {
      extension.initialize(messageService);
    } catch (error) {
      console.error(`Failed to initialize extension ${extension.name}:`, error);
    }
  }
}

/**
 * Cleanup all extensions
 */
export function cleanupMessageExtensions(): void {
  for (const extension of extensions) {
    try {
      extension.cleanup?.();
    } catch (error) {
      console.error(`Failed to cleanup extension ${extension.name}:`, error);
    }
  }
}