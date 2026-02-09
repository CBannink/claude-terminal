import { useState, useCallback, useEffect, useRef } from "react";
import { terminalManager } from "../../lib/terminal-manager";
import { useTerminalStore } from "../../stores/terminalStore";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const setSearchOpen = useTerminalStore((s) => s.setSearchOpen);

  const handleClose = useCallback(() => {
    terminalManager.clearSearch();
    setSearchOpen(false);
  }, [setSearchOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "Enter") {
        if (e.shiftKey) {
          terminalManager.findPrevious(query);
        } else {
          terminalManager.findNext(query);
        }
      }
    },
    [handleClose, query]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query) {
      terminalManager.findNext(query);
    } else {
      terminalManager.clearSearch();
    }
  }, [query]);

  return (
    <div className="absolute top-2 right-2 flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg px-2 py-1.5 z-50">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        className="bg-transparent text-sm text-zinc-200 outline-none w-48 placeholder-zinc-500"
      />
      <button
        onClick={() => terminalManager.findPrevious(query)}
        className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Previous (Shift+Enter)"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 8L7 4L11 8" />
        </svg>
      </button>
      <button
        onClick={() => terminalManager.findNext(query)}
        className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Next (Enter)"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 6L7 10L11 6" />
        </svg>
      </button>
      <button
        onClick={handleClose}
        className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Close (Esc)"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="3" y1="3" x2="11" y2="11" />
          <line x1="11" y1="3" x2="3" y2="11" />
        </svg>
      </button>
    </div>
  );
}
