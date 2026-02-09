export type SessionStatus = "idle" | "starting" | "running" | "exited" | "error";

export interface TerminalSession {
  id: string;
  status: SessionStatus;
  claudePath: string | null;
  model: string | null;
  sessionId: string | null;
  startedAt: number | null;
  exitCode: number | null;
}

export interface PtyHandle {
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
}
