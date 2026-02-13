/**
 * Message types for conversation history and message management
 * This provides type safety for all message-related operations
 */

/**
 * Represents a single message in the conversation
 */
export interface Message {
  /** Unique identifier for the message */
  id: string;
  
  /** Role of the message sender */
  role: "user" | "assistant" | "system";
  
  /** Message content (plain text) */
  content: string;
  
  /** When the message was sent/received */
  timestamp: Date;
  
  /** Original content with ANSI codes (if different from content) */
  rawContent?: string;
  
  /** Additional metadata about the message */
  metadata?: {
    /** Model used for this response */
    model?: string;
    
    /** Token count */
    tokens?: number;
    
    /** Whether this message was edited */
    edited?: boolean;
    
    /** Files attached to this message */
    attachments?: string[];
    
    /** Whether this message contains a code block */
    isCodeBlock?: boolean;
    
    /** Programming language for code blocks */
    codeLanguage?: string;
    
    /** Position information for terminal overlay */
    startLine?: number;
    startPosition?: number;
    endPosition?: number;
  };
}

/**
 * Extended message with UI-related properties
 * Used for display and interaction in the conversation history
 */
export interface UIMessage extends Message {
  /** Whether this message is currently selected */
  isSelected?: boolean;
  
  /** Whether this message is being edited */
  isEditing?: boolean;
  
  /** UI display properties */
  displayProps?: {
    /** Background color for message bubble */
    backgroundColor?: string;
    
    /** Text color */
    textColor?: string;
    
    /** Border color */
    borderColor?: string;
  };
}

/**
 * Message collection with utility methods
 * This provides a convenient API for working with groups of messages
 */
export interface MessageCollection {
  /** All messages in the collection */
  messages: Message[];
  
  /** Get message by ID */
  getById(id: string): Message | undefined;
  
  /** Get messages by role */
  getByRole(role: Message["role"]): Message[];
  
  /** Get most recent message */
  getLatest(): Message | undefined;
  
  /** Filter messages by content */
  search(query: string): Message[];
  
  /** Add a new message */
  add(message: Message): void;
  
  /** Update an existing message */
  update(id: string, updates: Partial<Message>): boolean;
  
  /** Remove a message */
  remove(id: string): boolean;
}

/**
 * Message parser function type
 * Used for custom message parsing extensions
 */
export type MessageParser = (terminalLines: string[]) => Message[] | null;

/**
 * Message formatter function type
 * Used for custom message formatting extensions
 */
export type MessageFormatter = (message: Message) => string;

/**
 * Message filter function type
 * Used for filtering and searching messages
 */
export type MessageFilter = (message: Message) => boolean;

/**
 * Message copy options
 * Controls how messages are copied to clipboard
 */
export interface CopyOptions {
  /** Include timestamps in copied text */
  includeTimestamps?: boolean;
  
  /** Include role indicators ("User:", "Claude:") */
  includeRoles?: boolean;
  
  /** Format as markdown */
  asMarkdown?: boolean;
  
  /** Include raw content (with ANSI codes) */
  includeRaw?: boolean;
  
  /** Custom format function */
  format?: (message: Message) => string;
}

/**
 * Message selection range
 * Used for selecting multiple messages
 */
export interface MessageSelection {
  /** Start message index */
  start: number;
  
  /** End message index */
  end: number;
  
  /** Whether selection is active */
  active: boolean;
}