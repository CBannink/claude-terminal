import { useEffect } from "react";
import { AppShell } from "./components/Layout/AppShell";
import { useSettings } from "./hooks/useSettings";
import { useTerminalStore } from "./stores/terminalStore";

function App() {
  const { loaded } = useSettings();
  const setSearchOpen = useTerminalStore((s) => s.setSearchOpen);
  const setSettingsOpen = useTerminalStore((s) => s.setSettingsOpen);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+F → Search
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Ctrl+, → Settings
      if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSearchOpen, setSettingsOpen]);

  if (!loaded) {
    return (
      <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    );
  }

  return <AppShell />;
}

export default App;
