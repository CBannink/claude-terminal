/**
 * Enhanced Terminal View - Hybrid terminal with enhanced input
 * Combines xterm.js terminal display with enhanced text input field
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { TerminalView } from "./TerminalView";
import { useClaudeProcess } from "../../hooks/useClaudeProcess";
import { usePty } from "../../hooks/usePty";
import { terminalManager } from "../../lib/terminal-manager";
import { messageService } from "../../lib/message-service";
import { Send, Copy, Trash } from "lucide-react";
import { TerminalOverlay } from "./TerminalOverlay";
import { useTerminalStore } from "../../stores/terminalStore";

/**
 * Enhanced Terminal Input Props
 */
interface EnhancedTerminalInputProps {
  onSend: (input: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * Enhanced input field component
 * Provides rich text editing capabilities while maintaining terminal compatibility
 */
function EnhancedTerminalInput({ onSend, onFocus, onBlur }: EnhancedTerminalInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isMultiline, setIsMultiline] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to get correct scrollHeight
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      
      // Limit maximum height
      const maxHeight = 200;
      const newHeight = Math.min(scrollHeight, maxHeight);
      
      textareaRef.current.style.height = `${newHeight}px`;
      
      // Detect multiline
      const isMulti = textareaRef.current.value.includes('\n');
      setIsMultiline(isMulti);
    }
  }, [inputValue]);
  
  // Handle keyboard input with enhanced features
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        // Add to history before sending
        setHistory(prev => [inputValue, ...prev.slice(0, 9)]) // Keep last 10 items
        setHistoryIndex(-1);
        onSend(inputValue);
        setInputValue("");
      }
    }
    // Allow Shift+Enter for new lines
    else if (e.key === 'Enter' && e.shiftKey) {
      // Handled by default textarea behavior
    }
    // Handle command shortcuts
    else if (e.key === '/' && !inputValue.startsWith('/')) {
      // Could add command palette here
    }
    // Handle Tab for indentation
    else if (e.key === 'Tab') {
      e.preventDefault();
      const start = textareaRef.current?.selectionStart || 0;
      const end = textareaRef.current?.selectionEnd || 0;
      
      setInputValue(prev => {
        return prev.substring(0, start) + '  ' + prev.substring(end);
      });
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
    // Handle history navigation with ArrowUp/ArrowDown
    else if (e.key === 'ArrowUp' && history.length > 0) {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex === -1 ? history.length - 1 : historyIndex + 1;
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex]);
      }
    }
    else if (e.key === 'ArrowDown' && historyIndex !== -1) {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex]);
      } else {
        // Back to empty input
        setHistoryIndex(-1);
        setInputValue("");
      }
    }
    // Handle backspace/delete more intelligently
    else if (e.key === 'Backspace' || e.key === 'Delete') {
      // Could add special handling for multi-line editing here
    }
  }, [inputValue, onSend, history, historyIndex]);
  
  // Handle paste events
  const handlePaste = useCallback((_e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Could add paste processing here
  }, []);
  
  // Handle input changes with auto-bracket matching
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    // Check if we need to add closing bracket
    if (cursorPosition > 0) {
      const charBefore = value[cursorPosition - 1];
      const needsClosing = ['(', '[', '{', '"' , '"', '`'].includes(charBefore);
      
      if (needsClosing) {
        const closingChar = getClosingChar(charBefore);
        const newValue = value.substring(0, cursorPosition) + closingChar + value.substring(cursorPosition);
        
        setInputValue(newValue);
        
        // Move cursor between the brackets
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = cursorPosition;
            textareaRef.current.selectionEnd = cursorPosition;
          }
        }, 0);
        
        return;
      }
    }
    
    setInputValue(value);
  }, []);
  
  // Helper function to get closing character
  const getClosingChar = (openingChar: string): string => {
    switch (openingChar) {
      case '(': return ')';
      case '[': return ']';
      case '{': return '}';
      case '"': return '"';
      case "'": return "'";
      case '`': return '`';
      default: return '';
    }
  };
  
  // Focus management
  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);
  
  const handleBlur = useCallback(() => {
    onBlur?.();
  }, [onBlur]);
  
  return (
    <div
      ref={inputContainerRef}
      className="border-t border-zinc-700 bg-zinc-900/50 backdrop-blur-sm"
    >
      <div className="flex items-end gap-2 px-3 py-2">
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={handleFocus}
            onBlur={handleBlur}
            
            placeholder={isMultiline ? "Type your message... (Shift+Enter for new line)" : "Type your message... (Enter to send)"}
            
            className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 
                      resize-none overflow-hidden outline-none 
                      min-h-[24px] max-h-[200px] py-1 
                      terminal-input-enhancement"
            
            style={
              {
                lineHeight: '1.4',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                // Terminal-like cursor
                caretColor: '#4dabf7',
                caretShape: 'block'
              }
            }
          />
        </div>
        
        <div className="flex gap-1 mb-1">
          {/* Copy latest message button */}
          <button
            onClick={async () => {
              const latest = messageService.getLatest();
              if (latest) {
                await messageService.copyMessage(latest);
              }
            }}
            title="Copy latest message"
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100"
          >
            <Copy size={16} />
          </button>
          
          {/* Send button */}
          <button
            onClick={() => {
              if (inputValue.trim()) {
                onSend(inputValue);
                setInputValue("");
              }
            }}
            title="Send message (Enter)"
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100"
          >
            <Send size={16} />
          </button>
          
          {/* Clear button */}
          {inputValue && (
            <button
              onClick={() => setInputValue("")}
              title="Clear input"
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100"
            >
              <Trash size={16} />
            </button>
          )}
        </div>
      </div>
      
      {/* Quick help text */}
      <div className="px-3 pb-1">
        <div className="text-xs text-zinc-500 flex items-center gap-4">
          <div className="flex items-center gap-1">
            <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-xs">↵</kbd>
            <span>Send</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-xs">⇧</kbd>
            <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-xs">↵</kbd>
            <span>New line</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-xs">/</kbd>
            <span>Commands</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Message Copy Overlay
 * Shows when messages are available for copying
 */
function MessageCopyOverlay() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  // Check for messages periodically
  useEffect(() => {
    const checkMessages = () => {
      const allMessages = messageService.getAllMessages();
      setMessages(allMessages);
      setShowOverlay(allMessages.length > 0);
    };

    checkMessages();
    const interval = setInterval(checkMessages, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!showOverlay || messages.length === 0) return null;

  return (
    <div className="absolute bottom-20 left-4 right-4 pointer-events-none">
      <div className="flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Copy latest message
            const latest = messages[messages.length - 1];
            messageService.copyMessage(latest);
          }}
          className="pointer-events-auto bg-zinc-900/80 backdrop-blur-sm 
                    border border-zinc-700 rounded-full px-3 py-1 
                    text-xs text-zinc-300 hover:bg-zinc-800 
                    flex items-center gap-1 transition-colors"
          title="Copy latest message"
        >
          <Copy size={14} />
          <span>Copy Latest Message</span>
          <kbd className="bg-zinc-700 px-1 py-0.5 rounded text-xs ml-1">⌘C</kbd>
        </button>
      </div>
    </div>
  );
}

/**
 * Enhanced Terminal View Component
 * Main component that combines terminal display with enhanced input and overlay
 */
export function EnhancedTerminalView() {
  const { sendInput } = useClaudeProcess();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  
  // Handle sending input
  const handleSend = useCallback((input: string) => {
    console.log("=== EnhancedTerminalView.handleSend START ===");
    console.log("Input to send:", input);
    
    if (!input.trim()) {
      console.log("Input is empty or whitespace only, skipping");
      return;
    }
    
    // Get the PTY instance directly
    const pty = usePty();
    console.log("PTY instance:", pty);
    console.log("PTY write method available:", !!pty?.write);
    
    // Get current terminal state
    const term = terminalManager.term;
    console.log("Terminal instance:", term);
    
    // Get current input mode
    const originalInputMode = useTerminalStore.getState().inputMode;
    console.log("Original input mode:", originalInputMode);
    
    // Temporarily switch to terminal mode to allow input to be processed
    console.log("Switching to terminal mode for input processing");
    useTerminalStore.getState().setInputMode("terminal");
    
    try {
      if (pty && pty.write) {
        console.log("Writing directly to PTY:", input + "\\r");
        pty.write(input + "\r");
        console.log("PTY write completed");
      } else {
        console.log("PTY write not available, using fallback sendInput");
        console.log("Calling sendInput with:", input + "\\r");
        sendInput(input + "\r");
        console.log("sendInput completed");
      }
    } catch (error) {
      console.error("Error sending input:", error);
    } finally {
      // Restore the original input mode
      console.log("Restoring input mode to:", originalInputMode);
      useTerminalStore.getState().setInputMode(originalInputMode);
      console.log("Input mode restored");
    }

    // Invalidate message cache since terminal content changed
    console.log("Invalidating message cache");
    messageService.invalidateCache();
    console.log("=== EnhancedTerminalView.handleSend END ===");
  }, [sendInput]);

  // Focus terminal when clicking on it
  const handleTerminalClick = useCallback(() => {
    if (!isInputFocused) {
      const term = terminalManager.term;
      term?.focus();
    }
  }, [isInputFocused]);

  // Refresh messages periodically for overlay
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(messageService.getAllMessages(true));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full relative" ref={terminalContainerRef}>
      {/* Terminal display area (read-only) */}
      <div
        className="flex-1 min-h-0 overflow-hidden"
        onClick={handleTerminalClick}
      >
        <TerminalView />
        
        {/* Terminal overlay for message selection */}
        <TerminalOverlay messages={messages} />
      </div>
      
      {/* Enhanced input area */}
      <EnhancedTerminalInput
        onSend={handleSend}
        onFocus={() => setIsInputFocused(true)}
        onBlur={() => setIsInputFocused(false)}
      />
      
      {/* Message copy overlay */}
      <MessageCopyOverlay />
      
      {/* Quick help tooltip */}
      <div className="absolute bottom-2 left-4 pointer-events-none">
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 
                      rounded px-2 py-1 text-xs text-zinc-400">
          Enhanced Input Mode - Type normally, press Enter to send
        </div>
      </div>
    </div>
  );
}