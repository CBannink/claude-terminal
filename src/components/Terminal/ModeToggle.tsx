/**
 * Mode Toggle - Switch between Terminal and Enhanced Input modes
 * Provides a toggle button in the toolbar for switching modes
 */

import { useState, useEffect } from "react";
import { Edit, Terminal as TerminalIcon } from "lucide-react";
import { useTerminalStore } from "../../stores/terminalStore";

/**
 * Mode Toggle Component
 * Shows current mode and allows switching between terminal and enhanced modes
 */
export function ModeToggle() {
  const [isEnhancedMode, setIsEnhancedMode] = useState(false);
  const setEditorOpen = useTerminalStore((s) => s.setEditorOpen);
  
  // Close editor when switching to enhanced mode
  useEffect(() => {
    if (isEnhancedMode) {
      setEditorOpen(false);
    }
  }, [isEnhancedMode, setEditorOpen]);
  
  const toggleMode = () => {
    setIsEnhancedMode(!isEnhancedMode);
  };
  
  return (
    <button
      onClick={toggleMode}
      title={isEnhancedMode ? "Switch to Terminal Mode" : "Switch to Enhanced Input Mode"}
      className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
        isEnhancedMode 
          ? 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30' 
          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
      }`}
    >
      {isEnhancedMode ? (
        <>
          <Edit size={14} />
          <span>Enhanced</span>
        </>
      ) : (
        <>
          <TerminalIcon size={14} />
          <span>Terminal</span>
        </>
      )}
    </button>
  );
}

/**
 * Hook to access current mode
 * Can be used by other components to determine which mode is active
 */
export function useModeToggle() {
  const [isEnhancedMode, setIsEnhancedMode] = useState(false);
  
  return {
    isEnhancedMode,
    setIsEnhancedMode,
    toggleMode: () => setIsEnhancedMode(!isEnhancedMode)
  };
}