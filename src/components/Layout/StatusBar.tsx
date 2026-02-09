import { useTerminalStore } from "../../stores/terminalStore";
import { useSettingsStore } from "../../stores/settingsStore";

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-zinc-500",
  starting: "bg-yellow-500 animate-pulse",
  running: "bg-green-500",
  exited: "bg-zinc-500",
  error: "bg-red-500",
};

export function StatusBar() {
  const status = useTerminalStore((s) => s.status);
  const sessionId = useTerminalStore((s) => s.sessionId);
  const model = useTerminalStore((s) => s.model);
  const error = useTerminalStore((s) => s.error);
  const exitCode = useTerminalStore((s) => s.exitCode);
  const themeName = useSettingsStore((s) => s.settings.theme);

  return (
    <div className="flex items-center h-6 px-3 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500 gap-4 select-none">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] || STATUS_COLORS.idle}`} />
        <span className="capitalize">{status}</span>
        {status === "exited" && exitCode !== null && (
          <span className="text-zinc-600">(code {exitCode})</span>
        )}
      </div>

      {model && (
        <div className="text-zinc-500">
          Model: <span className="text-zinc-400">{model}</span>
        </div>
      )}

      {sessionId && (
        <div className="text-zinc-600 truncate max-w-48">
          Session: {sessionId}
        </div>
      )}

      {error && (
        <div className="text-red-400 truncate flex-1">{error}</div>
      )}

      <div className="flex-1" />

      <div className="text-zinc-600 capitalize">{themeName}</div>
    </div>
  );
}
