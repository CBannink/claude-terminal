import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { terminalManager } from "../../lib/terminal-manager";
import { useClaudeProcess } from "../../hooks/useClaudeProcess";

interface SessionInfo {
  id: string;
  project: string;
  modified: number;
}

interface SessionPickerProps {
  onClose: () => void;
}

export function SessionPicker({ onClose }: SessionPickerProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { startClaude, cleanup } = useClaudeProcess();

  useEffect(() => {
    (async () => {
      try {
        const result = await invoke<SessionInfo[]>("list_sessions");
        setSessions(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setSessions([]);
      }
      setLoading(false);
    })();
  }, []);

  const handleResume = useCallback(
    async (sessionId: string) => {
      const term = terminalManager.term;
      if (!term) return;
      cleanup();
      term.clear();
      term.reset();
      await startClaude(term, { resumeId: sessionId });
      onClose();
    },
    [cleanup, startClaude, onClose]
  );

  const formatTime = (timestamp: number) => {
    if (timestamp === 0 || timestamp == null) return "Unknown";
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Less than 1h ago";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-[500px] max-h-[60vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200">Resume Session</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-zinc-500 text-sm">Loading sessions...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-400 text-sm">Failed to load sessions: {error}</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No sessions found</div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleResume(session.id)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100 font-mono truncate max-w-[280px]">
                      {session.id.substring(0, 8)}...
                    </span>
                    <span className="text-xs text-zinc-600">{formatTime(session.modified)}</span>
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5 truncate">
                    {session.project}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
