import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { SerializeAddon } from "@xterm/addon-serialize";
import { themes, getXtermTheme } from "./themes";
import { log } from "./logger";
import type { AppSettings } from "../types/settings";

class TerminalManager {
  term: Terminal | null = null;
  fitAddon: FitAddon | null = null;
  searchAddon: SearchAddon | null = null;

  init(container: HTMLDivElement, settings: AppSettings): Terminal {
    if (this.term) return this.term;

    log("info", "TerminalManager.init: creating terminal instance");

    const theme = themes[settings.theme] || themes.dark;

    const term = new Terminal({
      theme: getXtermTheme(theme),
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      cursorStyle: settings.cursorStyle,
      cursorBlink: settings.cursorBlink,
      scrollback: settings.scrollback,
      allowProposedApi: true,
      convertEol: false,
      windowsMode: false,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();
    const unicode11Addon = new Unicode11Addon();
    const serializeAddon = new SerializeAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(unicode11Addon);
    term.loadAddon(serializeAddon);

    term.unicode.activeVersion = "11";

    term.open(container);

    // Try WebGL renderer, fall back to canvas
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      term.loadAddon(webglAddon);
      log("info", "TerminalManager.init: WebGL renderer loaded");
    } catch {
      log("warn", "TerminalManager.init: WebGL not available, using canvas renderer");
    }

    // Defer fit to next frame so the container has computed dimensions
    requestAnimationFrame(() => {
      fitAddon.fit();
      log("info", `TerminalManager.init: fitted to ${term.cols}x${term.rows}`);
    });

    this.term = term;
    this.fitAddon = fitAddon;
    this.searchAddon = searchAddon;

    return term;
  }

  fit() {
    this.fitAddon?.fit();
  }

  dispose() {
    log("info", "TerminalManager.dispose: cleaning up");
    this.term?.dispose();
    this.term = null;
    this.fitAddon = null;
    this.searchAddon = null;
  }

  findNext(query: string) {
    this.searchAddon?.findNext(query);
  }

  findPrevious(query: string) {
    this.searchAddon?.findPrevious(query);
  }

  clearSearch() {
    this.searchAddon?.clearDecorations();
  }

  applySettings(settings: AppSettings) {
    if (!this.term) return;
    const theme = themes[settings.theme] || themes.dark;
    this.term.options.theme = getXtermTheme(theme);
    this.term.options.fontFamily = settings.fontFamily;
    this.term.options.fontSize = settings.fontSize;
    this.term.options.cursorStyle = settings.cursorStyle;
    this.term.options.cursorBlink = settings.cursorBlink;
    this.fit();
  }
}

export const terminalManager = new TerminalManager();
