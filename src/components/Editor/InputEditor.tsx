import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap } from "@codemirror/commands";
import { Copy, Send, Trash, X } from "lucide-react";
import { useTerminalStore } from "../../stores/terminalStore";
import { useClaudeProcess } from "../../hooks/useClaudeProcess";

export function InputEditor() {
  const editorBuffer = useTerminalStore((s) => s.editorBuffer);
  const setEditorBuffer = useTerminalStore((s) => s.setEditorBuffer);
  const setEditorOpen = useTerminalStore((s) => s.setEditorOpen);
  const clearEditorBuffer = useTerminalStore((s) => s.clearEditorBuffer);
  const { sendInput } = useClaudeProcess();

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Use refs to avoid stale closures in CodeMirror keybindings
  const handleSendRef = useRef<() => void>(() => {});
  const handleCloseRef = useRef<() => void>(() => {});
  const setEditorBufferRef = useRef<(content: string) => void>(() => {});

  // Update refs when state changes
  setEditorBufferRef.current = setEditorBuffer;

  const handleCopy = useCallback(() => {
    if (editorBuffer) {
      navigator.clipboard.writeText(editorBuffer);
    }
  }, [editorBuffer]);

  const handleSend = useCallback(() => {
    if (!editorBuffer.trim()) return;
    sendInput(editorBuffer + "\r");
    clearEditorBuffer();
    setEditorOpen(false);
  }, [editorBuffer, sendInput, clearEditorBuffer, setEditorOpen]);

  const handleClear = useCallback(() => {
    clearEditorBuffer();
  }, [clearEditorBuffer]);

  const handleClose = useCallback(() => {
    setEditorOpen(false);
  }, [setEditorOpen]);

  // Update refs
  handleSendRef.current = handleSend;
  handleCloseRef.current = handleClose;

  // Initialize CodeMirror (runs once on mount)
  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      parent: editorRef.current,
      state: EditorState.create({
        doc: editorBuffer,
        extensions: [
          keymap.of([
            ...defaultKeymap,
            {
              key: "Ctrl-Enter",
              run: () => {
                handleSendRef.current?.();
                return true;
              },
            },
            {
              key: "Escape",
              run: () => {
                handleCloseRef.current?.();
                return true;
              },
            },
          ]),
          markdown(),
          oneDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              setEditorBufferRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
    });

    viewRef.current = view;
    view.focus();

    return () => {
      view.destroy();
    };
  }, []); // Empty deps: initialize once, use refs for callbacks

  // Sync Zustand → CodeMirror (external changes)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== editorBuffer) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: editorBuffer },
      });
    }
  }, [editorBuffer]);

  return (
    <div className="flex flex-col border-b border-zinc-700">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900">
        <span className="text-xs text-zinc-400">Input Editor</span>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs hover:bg-zinc-800 rounded flex items-center gap-1"
            title="Copy to clipboard"
          >
            <Copy size={14} /> Copy
          </button>
          <button
            onClick={handleSend}
            className="px-2 py-1 text-xs hover:bg-zinc-800 rounded flex items-center gap-1"
            title="Send input (Ctrl+Enter)"
          >
            <Send size={14} /> Send
          </button>
          <button
            onClick={handleClear}
            className="px-2 py-1 text-xs hover:bg-zinc-800 rounded flex items-center gap-1"
            title="Clear buffer"
          >
            <Trash size={14} /> Clear
          </button>
          <button
            onClick={handleClose}
            className="px-2 py-1 text-xs hover:bg-zinc-800 rounded"
            title="Close editor (Escape)"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div
        ref={editorRef}
        className="overflow-auto"
        style={{ minHeight: "150px", maxHeight: "400px" }}
      />
    </div>
  );
}
