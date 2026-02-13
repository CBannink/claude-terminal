/**
 * Terminal Overlay System
 * Transparent overlay for terminal that enables message selection and copying
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Message } from "../../types/messages";
import { messageService } from "../../lib/message-service";
import { Copy, Check } from "lucide-react";

/**
 * Selectable Message Component
 * Individual message region that can be hovered and selected
 */
interface SelectableMessageProps {
  message: Message;
  onHover: (messageId: string | null) => void;
  onSelect: (message: Message) => void;
  isHovered: boolean;
}

function SelectableMessage({ message, onHover, onSelect, isHovered }: SelectableMessageProps) {
  const [showCopyButton, setShowCopyButton] = useState(false);
  const [copied, setCopied] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  
  // Handle copy action
  const handleCopy = useCallback(async () => {
    const success = await messageService.copyMessage(message);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [message]);
  
  // Handle mouse events
  const handleMouseEnter = useCallback(() => {
    onHover(message.id);
    setShowCopyButton(true);
  }, [message.id, onHover]);
  
  const handleMouseLeave = useCallback(() => {
    onHover(null);
    setShowCopyButton(false);
  }, [onHover]);
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(message);
  }, [message, onSelect]);
  
  // Handle context menu (right-click)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Copy the message when right-clicked
    messageService.copyMessage(message);
    
    // Show feedback
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message]);
  
  // Calculate position based on metadata
  const getPosition = useCallback(() => {
    if (!message.metadata?.startLine) return { top: 0, left: 0 };
    
    // Calculate approximate position based on line number
    // This is a simplified calculation - in a real implementation,
    // we would need to measure actual line heights
    const lineHeight = 18; // Approximate line height in pixels
    const top = message.metadata.startLine * lineHeight;
    
    return { top, left: 0 };
  }, [message.metadata]);
  
  const position = getPosition();
  
  return (
    <div
      ref={messageRef}
      className={`absolute left-0 right-0 pointer-events-none transition-colors duration-200`}
      style={{
        top: `${position.top}px`,
        minHeight: '18px',
        ...(isHovered ? { backgroundColor: 'rgba(77, 171, 247, 0.1)' } : {})
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Copy button - appears on hover */}
      {showCopyButton && (
        <div className="pointer-events-auto absolute right-2 top-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className={`p-1 rounded copy-button terminal-overlay-element ${
              copied ? 'copied' : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80'
            }`}
            title={copied ? 'Copied!' : 'Copy message'}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Terminal Overlay Component
 * Main overlay that renders selectable message regions
 */
export interface TerminalOverlayProps {
  messages: Message[];
  onMessageSelect?: (message: Message) => void;
}

export function TerminalOverlay({ messages, onMessageSelect }: TerminalOverlayProps) {
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  
  // Handle message selection
  const handleSelect = useCallback((message: Message) => {
    setSelectedMessage(message);
    onMessageSelect?.(message);
  }, [onMessageSelect]);
  
  // Clear selection when clicking outside
  const handleOverlayClick = useCallback(() => {
    setSelectedMessage(null);
  }, []);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+C or Cmd+C to copy selected message
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      if (selectedMessage) {
        e.preventDefault();
        messageService.copyMessage(selectedMessage);
      }
    }
    // Escape to clear selection
    else if (e.key === 'Escape') {
      setSelectedMessage(null);
    }
  }, [selectedMessage]);
  
  // Set up keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  if (messages.length === 0) {
    return null;
  }
  
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      onClick={handleOverlayClick}
    >
      {messages.map((message) => (
        <SelectableMessage
          key={message.id}
          message={message}
          onHover={setHoveredMessageId}
          onSelect={handleSelect}
          isHovered={hoveredMessageId === message.id}
        />
      ))}
      
      {/* Selection indicator */}
      {selectedMessage && (
        <div
          className="absolute pointer-events-none border-l-2 border-blue-500"
          style={{
            left: '4px',
            top: `${(selectedMessage.metadata?.startLine || 0) * 18}px`,
            height: 'calc(100% - ${(selectedMessage.metadata?.startLine || 0) * 18}px)'
          }}
        />
      )}
    </div>
  );
}

/**
 * Enhanced Terminal View with Overlay Integration
 * Combines terminal display with overlay functionality
 */
export function TerminalWithOverlay() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  
  // Refresh messages periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(messageService.getAllMessages(true));
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  // Handle message selection
  const handleMessageSelect = useCallback((message: Message) => {
    setSelectedMessage(message);
  }, []);
  
  return (
    <div className="relative h-full">
      {/* Terminal display (from TerminalView) */}
      <div className="h-full">
        {/* In a real implementation, this would be the actual TerminalView component */}
        <div className="h-full bg-zinc-900 text-zinc-100 p-4 overflow-auto font-mono text-sm">
          {messages.map((message) => (
            <div key={message.id} className="mb-2">
              <span className="text-blue-400">
                {message.role === 'user' ? '👤 You:' : '🤖 Claude:'}
              </span>
              <span className="ml-2">{message.content}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Terminal overlay */}
      <TerminalOverlay
        messages={messages}
        onMessageSelect={handleMessageSelect}
      />
      
      {/* Selection info */}
      {selectedMessage && (
        <div className="absolute bottom-4 left-4 bg-zinc-800/90 text-zinc-300 px-3 py-1 rounded text-sm">
          Selected: {selectedMessage.role} message
        </div>
      )}
    </div>
  );
}