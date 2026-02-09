# Enhanced Editor Mode - Implementation Plan

## Vision

Transform Claude Terminal from a simple terminal emulator into an **advanced Claude Code chat interface** with rich editing capabilities, while maintaining the power of true terminal emulation.

### Goals

- ✅ Keep xterm.js for true terminal features (ANSI colors, interactive prompts, TUI)
- ✅ Add enhanced editor mode with conversation history and rich editing
- ✅ Enable easy text selection, copying, and editing (solve the Ctrl+C conflict)
- ✅ Build foundation for future features: agent presets, templates, context management
- ✅ Create a specialized "Claude IDE" not just "another terminal"

---

## Current State (PR #4)

### What We Have
- ✅ xterm.js terminal with Claude Code CLI integration
- ✅ Basic editor mode (Ctrl+E toggle)
- ✅ CodeMirror input editor with markdown support
- ✅ Dual-mode system: terminal mode (default) + editor mode
- ✅ PTY input gating (suppress terminal input in editor mode)

### Current Problems
1. ⚠️ Import error: `codemirror` package not resolving in Vite
2. ❌ Editor mode only shows input box (no conversation history)
3. ❌ Can't easily select/copy from Claude's responses
4. ❌ Editor feels disconnected from the conversation

---

## Architecture

### Two Modes

```
┌─────────────────────────────────────────────────────────────┐
│ TERMINAL MODE (default)                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ xterm.js Terminal                                       │ │
│ │ - Full ANSI support                                     │ │
│ │ - Claude's native TUI                                   │ │
│ │ - Interactive prompts                                   │ │
│ │ - Character-by-character input                          │ │
│ │ - True terminal emulation                               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Press Ctrl+E to switch to Editor Mode →                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ EDITOR MODE (Ctrl+E)                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📜 Conversation History (readonly, selectable)          │ │
│ │ ──────────────────────────────────────────────────────  │ │
│ │ 🤖 Claude: Here's the implementation...                │ │
│ │    ```typescript                                        │ │
│ │    function example() { ... }                           │ │
│ │    ```                                                  │ │
│ │                                                          │ │
│ │ 👤 You: Can you explain how this works?                │ │
│ │                                                          │ │
│ │ 🤖 Claude: Sure! This function...                      │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ✏️ Your Input (CodeMirror editor)                      │ │
│ │ [Type here with full text editing capabilities]         │ │
│ │                                                          │ │
│ │ [📋 Copy] [📤 Send] [🗑️ Clear] [📝 Templates ▾]       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Press Escape to return to Terminal Mode                      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Terminal Output → Parse into Messages → Display in Editor Mode
                     ↓
              [Message Array]
                     ↓
         ┌───────────┴───────────┐
         ↓                       ↓
  Terminal Mode           Editor Mode
  (raw xterm.js)         (parsed + formatted)
```

---

## Implementation Phases

### **Phase 0: Fix Current Issues** ⚠️ URGENT

**Goal**: Get the basic editor mode working properly

**Tasks**:
1. ✅ Fix `codemirror` import error
   - Restart dev server completely
   - Verify `basicSetup` is imported correctly
   - Test that editor opens and text selection works

2. ✅ Test basic editor functionality
   - Open editor (Ctrl+E)
   - Type text
   - Select and delete text
   - Copy with Ctrl+C
   - Send with Ctrl+Enter

**Files**: `src/components/Editor/InputEditor.tsx`

**Estimated Time**: 30 minutes

---

### **Phase 1: Conversation History Parser**

**Goal**: Parse terminal buffer into conversation messages

**Tasks**:
1. Create message parser utility (`src/lib/message-parser.ts`)
   - Parse xterm.js buffer line-by-line
   - Detect message boundaries (prompts, responses)
   - Extract roles (user vs Claude)
   - Strip ANSI escape codes
   - Preserve formatting (code blocks, lists, etc.)

2. Add message types (`src/types/messages.ts`)
   ```typescript
   interface Message {
     id: string;
     role: "user" | "assistant" | "system";
     content: string;
     timestamp: Date;
     metadata?: {
       model?: string;
       tokens?: number;
     };
   }
   ```

3. Integrate with terminal manager
   - Add method: `terminalManager.getMessages(): Message[]`
   - Parse on-demand when editor mode opens
   - Cache parsed messages (invalidate on new output)

**Files**:
- `src/lib/message-parser.ts` (NEW)
- `src/types/messages.ts` (NEW)
- `src/lib/terminal-manager.ts` (MODIFY)

**Estimated Time**: 4-6 hours

**Challenges**:
- ANSI escape code parsing
- Detecting message boundaries (Claude's prompts vary)
- Handling multi-line responses
- Preserving code block formatting

---

### **Phase 2: Conversation History View**

**Goal**: Display parsed messages in editor mode

**Tasks**:
1. Create `ConversationHistory` component (`src/components/Editor/ConversationHistory.tsx`)
   - Scrollable message list
   - Message bubbles (user vs assistant styling)
   - Syntax highlighting for code blocks
   - Markdown rendering
   - Selectable text (for copying)

2. Integrate into `InputEditor`
   - Split layout: 70% history, 30% input
   - Load messages when editor opens: `terminalManager.getMessages()`
   - Auto-scroll to bottom on new messages
   - Make resizable (drag divider between history and input)

3. Styling
   - Terminal aesthetic (monospace, dark theme)
   - User messages: Right-aligned, blue accent
   - Claude messages: Left-aligned, green accent
   - Timestamp badges
   - Copy button per message

**Files**:
- `src/components/Editor/ConversationHistory.tsx` (NEW)
- `src/components/Editor/MessageBubble.tsx` (NEW)
- `src/components/Editor/InputEditor.tsx` (MODIFY)

**Estimated Time**: 4-6 hours

**UI Mockup**:
```
┌─────────────────────────────────────────────┐
│ Conversation History            [↑] [↓]     │
├─────────────────────────────────────────────┤
│                                              │
│  🤖 Claude • 10:23 PM            [📋 Copy]  │
│  Here's the implementation:                  │
│  ┌──────────────────────────────────────┐  │
│  │ function hello() {                   │  │
│  │   console.log("Hello!");             │  │
│  │ }                                    │  │
│  └──────────────────────────────────────┘  │
│                                              │
│           👤 You • 10:24 PM      [📋 Copy] │
│           Can you add error handling?       │
│                                              │
│  🤖 Claude • 10:24 PM            [📋 Copy]  │
│  Sure! Here's the updated version...        │
│                                              │
├─────────────────────────────────────────────┤ ← Resizable divider
│ ✏️ Your Input                               │
│ [Type here...]                               │
│                                              │
│ [📋 Copy] [📤 Send] [🗑️ Clear]             │
└─────────────────────────────────────────────┘
```

---

### **Phase 3: Enhanced Input Features**

**Goal**: Add power-user features to input editor

**Tasks**:
1. Multi-file context
   - Drag & drop files into editor
   - Show file badges with remove button
   - Include file contents in message

2. Templates system
   - Dropdown: "Templates ▾"
   - Predefined prompts: "Explain code", "Add tests", "Refactor"
   - Save custom templates
   - Template variables: `{code}`, `{file}`, `{selection}`

3. Input history
   - Up/Down arrows to navigate previous inputs
   - Persistent storage (localStorage or tauri-plugin-store)

4. Character/token counter
   - Show live count: "1,234 chars • ~310 tokens"
   - Warn if approaching limits

**Files**:
- `src/components/Editor/InputEditor.tsx` (MODIFY)
- `src/components/Editor/TemplateSelector.tsx` (NEW)
- `src/lib/templates.ts` (NEW)
- `src/stores/templateStore.ts` (NEW)

**Estimated Time**: 6-8 hours

---

### **Phase 4: Agent Presets**

**Goal**: Quick-switch between Claude modes and configurations

**Tasks**:
1. Preset system
   - Dropdown: "Agent Presets ▾"
   - Built-in: "Code Review", "Bug Hunter", "Architect", "Pair Programmer"
   - Custom presets (user-defined)

2. Preset structure
   ```typescript
   interface AgentPreset {
     name: string;
     model: string;  // claude-sonnet-4.5, opus-4.6, etc.
     systemPrompt?: string;
     temperature?: number;
     maxTokens?: number;
     tools?: string[];
   }
   ```

3. Integration with Claude CLI
   - Generate CLI args from preset
   - Pass to `buildClaudeArgs()` in `src/lib/claude-cli.ts`

4. Preset management UI
   - Create/edit/delete custom presets
   - Import/export presets (JSON files)
   - Share presets between projects

**Files**:
- `src/components/Editor/PresetSelector.tsx` (NEW)
- `src/components/Settings/PresetsSettings.tsx` (NEW)
- `src/lib/presets.ts` (NEW)
- `src/stores/presetStore.ts` (NEW)
- `src/lib/claude-cli.ts` (MODIFY)

**Estimated Time**: 8-10 hours

---

### **Phase 5: Advanced Features**

**Goal**: Power features for heavy Claude Code users

**Tasks**:
1. Conversation management
   - Save conversations to disk
   - Resume previous conversations
   - Search conversation history
   - Export conversations (markdown, JSON, HTML)

2. Context management
   - Manual context injection
   - File tree view (select files to include)
   - Symbol search (include specific functions/classes)
   - Token budget visualization

3. Keyboard shortcuts
   - Ctrl+K: Command palette
   - Ctrl+/: Quick actions
   - Ctrl+Shift+C: Copy last response
   - Alt+Up/Down: Navigate messages

4. Theme customization
   - Message bubble colors
   - Code block themes
   - Custom fonts
   - Layout preferences (compact/spacious)

**Files**: Multiple (TBD based on features selected)

**Estimated Time**: 15-20 hours

---

## Technical Decisions

### Message Parsing Strategy

**Option A: Real-time parsing**
- Parse terminal output as it arrives
- Maintain message array in state
- Pros: Always up-to-date, no parse lag
- Cons: Complex, may miss boundaries during streaming

**Option B: On-demand parsing** ⭐ RECOMMENDED
- Parse when editor mode opens
- Use xterm.js buffer: `term.buffer.active`
- Pros: Simpler, no performance impact during terminal mode
- Cons: Parse lag when opening editor (negligible for most conversations)

**Decision**: Go with Option B initially, optimize to Option A if needed.

---

### Conversation Storage

**Option A: In-memory only**
- Messages exist only while app is running
- Simple, no persistence

**Option B: Local storage** ⭐ RECOMMENDED
- Save to `tauri-plugin-store` or local JSON files
- Persist conversations across sessions
- Enable resume, search, export

**Decision**: Phase 1-2 use Option A, add Option B in Phase 5.

---

### Markdown Rendering

**Library Options**:
1. `react-markdown` - Simple, widely used
2. `marked` + `DOMPurify` - More control
3. Custom parser - Max flexibility

**Decision**: Use `react-markdown` for simplicity. Add syntax highlighting with `react-syntax-highlighter`.

---

## File Structure (After All Phases)

```
src/
├── components/
│   ├── Editor/
│   │   ├── InputEditor.tsx           (main editor component)
│   │   ├── ConversationHistory.tsx   (message list)
│   │   ├── MessageBubble.tsx         (individual message)
│   │   ├── TemplateSelector.tsx      (template dropdown)
│   │   ├── PresetSelector.tsx        (agent preset dropdown)
│   │   └── index.ts
│   ├── Terminal/
│   │   ├── TerminalView.tsx
│   │   └── TerminalToolbar.tsx
│   └── Settings/
│       ├── PresetsSettings.tsx
│       └── TemplatesSettings.tsx
├── lib/
│   ├── message-parser.ts             (parse terminal → messages)
│   ├── templates.ts                  (template management)
│   ├── presets.ts                    (agent preset logic)
│   └── terminal-manager.ts
├── stores/
│   ├── terminalStore.ts
│   ├── templateStore.ts              (template state)
│   └── presetStore.ts                (preset state)
└── types/
    ├── messages.ts                   (Message interface)
    ├── templates.ts                  (Template interface)
    └── presets.ts                    (AgentPreset interface)
```

---

## Dependencies to Add

```json
{
  "react-markdown": "^9.0.0",
  "react-syntax-highlighter": "^15.5.0",
  "date-fns": "^3.0.0",
  "zustand": "^5.0.0" // already installed
}
```

---

## Migration Path

### From Current PR #4 to Phase 1

1. Fix `codemirror` import (restart dev)
2. Merge PR #4 to master
3. Create new branch: `feat/enhanced-editor-mode`
4. Start Phase 1 implementation

### User Experience During Migration

- Terminal mode works perfectly throughout
- Editor mode gets progressively better with each phase
- No breaking changes (always backward compatible)
- Users can opt-in to new features as they're added

---

## Success Metrics

### Phase 0 Success
- ✅ Editor opens without errors
- ✅ Text selection works
- ✅ Copy/paste works
- ✅ Send button works

### Phase 2 Success
- ✅ Conversation history visible in editor mode
- ✅ Can copy any message easily
- ✅ Messages are readable and formatted nicely
- ✅ Editor mode feels like a "chat interface"

### Phase 4 Success
- ✅ Can switch agent presets easily
- ✅ Templates speed up common tasks
- ✅ Users prefer editor mode for complex prompts

### Ultimate Success
- ✅ Users choose Claude Terminal over web interface
- ✅ "Advanced Claude IDE" reputation in community
- ✅ Extensible foundation for future features

---

## Risks & Mitigations

### Risk: Message parsing is fragile
**Mitigation**: Start with simple heuristics, improve iteratively. Add tests with real terminal output samples.

### Risk: Performance issues with large conversations
**Mitigation**: Virtualize message list (react-window), paginate history, limit parsed messages (last 100).

### Risk: Markdown rendering breaks terminal aesthetic
**Mitigation**: Use terminal-themed markdown styles, monospace fonts, dark colors. Make it optional (toggle raw/formatted).

### Risk: Feature creep
**Mitigation**: Stick to phase-by-phase plan. Each phase should be independently valuable. Don't start Phase N until Phase N-1 is stable.

---

## Future Ideas (Beyond Phase 5)

- Multi-session tabs
- Split panes (two Claudes side-by-side)
- Voice input (speech-to-text)
- Collaborative sessions (share with team)
- Plugin system (user extensions)
- Web version (share terminal via URL)
- AI-powered suggestions ("Ask Claude to...")
- Integration with IDEs (VS Code extension)
- Mobile companion app

---

## Next Steps

1. **Immediate**: Fix Phase 0 issues, test basic editor
2. **This Week**: Implement Phase 1 (message parser)
3. **Next Week**: Implement Phase 2 (conversation history)
4. **Month 1**: Complete Phase 3 (enhanced input)
5. **Month 2**: Complete Phase 4 (agent presets)
6. **Month 3+**: Phase 5 and beyond

---

## Notes for Next Instance

### Current State When You Left Off
- PR #4 merged with basic editor mode
- `codemirror` package installed but import error exists
- Dev server needs full restart to fix Vite module resolution
- User wants "enhanced editor mode" not "replace xterm.js"

### First Thing to Do
```bash
# Stop any running dev servers
# Restart completely:
cmd.exe /c "set PATH=%USERPROFILE%\.cargo\bin;%PATH% && cd C:\claude-terminal && pnpm tauri dev"

# Test editor:
# 1. Press Ctrl+E
# 2. Type text
# 3. Select text - should work now with basicSetup
# 4. Delete, copy, paste - all should work
```

### Key Files to Read First
- `src/components/Editor/InputEditor.tsx` - Current editor implementation
- `src/lib/terminal-manager.ts` - Terminal singleton (need to add getMessages())
- `src/hooks/usePty.ts` - PTY integration (input gating)

### Architecture Reminder
- Keep xterm.js for terminal mode
- Enhance editor mode with conversation history
- Two modes, one app, best of both worlds

---

**Created**: 2026-02-09
**Author**: Claude (Sonnet 4.5)
**Status**: Draft - Ready for Phase 0
**Version**: 1.0
