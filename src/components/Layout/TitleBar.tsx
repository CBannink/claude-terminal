import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback } from "react";

export function TitleBar() {
  const handleMinimize = useCallback(() => {
    getCurrentWindow().minimize();
  }, []);

  const handleMaximize = useCallback(async () => {
    const appWindow = getCurrentWindow();
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      appWindow.unmaximize();
    } else {
      appWindow.maximize();
    }
  }, []);

  const handleClose = useCallback(() => {
    getCurrentWindow().close();
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Only drag on left mouse button and not on window control buttons
    if (e.button !== 0) return;
    getCurrentWindow().startDragging();
  }, []);

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleDragStart}
      className="flex items-center h-9 bg-zinc-950 select-none"
    >
      <div data-tauri-drag-region className="flex items-center gap-2 px-3 flex-1">
        <span className="text-indigo-400 font-semibold text-sm">Claude Terminal</span>
      </div>

      <div className="flex" onMouseDown={(e) => e.stopPropagation()}>
        <button
          onClick={handleMinimize}
          className="w-12 h-9 flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          tabIndex={-1}
          aria-label="Minimize window"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-9 flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          tabIndex={-1}
          aria-label="Maximize window"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-9 flex items-center justify-center hover:bg-red-600 text-zinc-400 hover:text-white transition-colors"
          tabIndex={-1}
          aria-label="Close window"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
