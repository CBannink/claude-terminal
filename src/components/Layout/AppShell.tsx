import { TitleBar } from "./TitleBar";
import { StatusBar } from "./StatusBar";
import { TerminalToolbar } from "../Terminal/TerminalToolbar";
import { TerminalView } from "../Terminal/TerminalView";
import { SearchBar } from "../Search/SearchBar";
import { SettingsDialog } from "../Settings/SettingsDialog";
import { SessionPicker } from "../Session/SessionPicker";
import { useTerminalStore } from "../../stores/terminalStore";

export function AppShell() {
  const searchOpen = useTerminalStore((s) => s.searchOpen);
  const settingsOpen = useTerminalStore((s) => s.settingsOpen);
  const sessionPickerOpen = useTerminalStore((s) => s.sessionPickerOpen);
  const setSessionPickerOpen = useTerminalStore((s) => s.setSessionPickerOpen);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950">
      <TitleBar />
      <TerminalToolbar />
      <div className="flex-1 relative overflow-hidden">
        <TerminalView />
        {searchOpen && <SearchBar />}
      </div>
      <StatusBar />
      {settingsOpen && <SettingsDialog />}
      {sessionPickerOpen && (
        <SessionPicker onClose={() => setSessionPickerOpen(false)} />
      )}
    </div>
  );
}
