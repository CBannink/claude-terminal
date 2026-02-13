/**
 * Test Terminal Component
 * Simple test component to verify the terminal overlay functionality
 */

import { useState, useEffect } from "react";
import { TerminalOverlay } from "./TerminalOverlay";
import { Message } from "../../types/messages";

export function TestTerminal() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  
  // Generate some test messages
  useEffect(() => {
    const testMessages: Message[] = [
      {
        id: "msg-1",
        role: "user",
        content: "Hello Claude! How are you doing today?",
        timestamp: new Date(Date.now() - 60000),
        metadata: {
          startLine: 0,
          startPosition: 0,
          endPosition: 10
        }
      },
      {
        id: "msg-2", 
        role: "assistant",
        content: "Hello! I'm doing great, thank you for asking. How can I assist you today?",
        timestamp: new Date(Date.now() - 30000),
        metadata: {
          startLine: 2,
          startPosition: 0,
          endPosition: 15
        }
      },
      {
        id: "msg-3",
        role: "user",
        content: "I need help with some code. Can you explain how to implement a React component?",
        timestamp: new Date(Date.now() - 15000),
        metadata: {
          startLine: 5,
          startPosition: 0,
          endPosition: 12
        }
      },
      {
        id: "msg-4",
        role: "assistant",
        content: "Certainly! Here's how you can implement a React component...",
        timestamp: new Date(),
        metadata: {
          startLine: 8,
          startPosition: 0,
          endPosition: 18
        }
      }
    ];
    
    setMessages(testMessages);
  }, []);
  
  // Handle message selection
  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(message);
    console.log("Selected message:", message.id);
  };
  
  return (
    <div className="relative h-[400px] w-full border border-zinc-700 rounded-lg overflow-hidden">
      {/* Mock terminal display */}
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
      
      {/* Terminal overlay */}
      <TerminalOverlay
        messages={messages}
        onMessageSelect={handleMessageSelect}
      />
      
      {/* Selection info */}
      {selectedMessage && (
        <div className="absolute bottom-4 left-4 bg-zinc-800/90 text-zinc-300 px-3 py-1 rounded text-sm">
          Selected: {selectedMessage.role} message (ID: {selectedMessage.id})
        </div>
      )}
      
      {/* Instructions */}
      <div className="absolute top-2 right-2 bg-zinc-900/80 text-zinc-400 px-2 py-1 rounded text-xs">
        Test Terminal - Hover over messages to see copy buttons
      </div>
    </div>
  );
}