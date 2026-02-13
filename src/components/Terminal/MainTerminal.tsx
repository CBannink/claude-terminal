/**
 * Main Terminal Component
 * Handles mode switching between regular terminal and enhanced terminal views
 */

import { TerminalView } from "./TerminalView";
import { EnhancedTerminalView } from "./EnhancedTerminalView";
import { ModeToggle, useModeToggle } from "./ModeToggle";

/**
 * Main Terminal Component
 * This is the primary terminal component that should be used in the app
 * It handles mode switching and renders the appropriate terminal view
 */
export function MainTerminal() {
  const { isEnhancedMode } = useModeToggle();
  
  return (
    <div className="flex flex-col h-full">
      {/* Mode toggle would typically go in the toolbar */}
      {/* <div className="p-2 border-b border-zinc-800">
        <ModeToggle />
      </div> */}
      
      {/* Render the appropriate terminal view based on mode */}
      <div className="flex-1 min-h-0">
        {isEnhancedMode ? (
          <EnhancedTerminalView />
        ) : (
          <TerminalView />
        )}
      </div>
    </div>
  );
}

/**
 * Terminal with Mode Toggle
 * Convenience component that includes the mode toggle button
 */
export function TerminalWithModeToggle() {
  const { isEnhancedMode, toggleMode } = useModeToggle();
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <ModeToggle />
        <button
          onClick={toggleMode}
          className="ml-2 px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded"
          title="Toggle Input Mode"
        >
          {isEnhancedMode ? "👤 Enhanced" : "💻 Terminal"}
        </button>
      </div>
      
      <div className="flex-1 min-h-0">
        {isEnhancedMode ? (
          <EnhancedTerminalView />
        ) : (
          <TerminalView />
        )}
      </div>
    </div>
  );
}