import { invoke } from "@tauri-apps/api/core";

export async function resolveClaudePath(): Promise<string> {
  return await invoke<string>("resolve_claude_path");
}

export interface ClaudeSpawnOptions {
  continueSession?: boolean;
  resumeId?: string;
  model?: string;
  extraArgs?: string[];
  cwd?: string;
}

export function buildClaudeArgs(options: ClaudeSpawnOptions): string[] {
  const args: string[] = [];

  if (options.continueSession) {
    args.push("--continue");
  }

  if (options.resumeId && options.resumeId.trim()) {
    args.push("--resume", options.resumeId.trim());
  }

  if (options.model && options.model.trim()) {
    args.push("--model", options.model.trim());
  }

  if (options.extraArgs) {
    const filtered = options.extraArgs.filter((a) => a && a.trim());
    args.push(...filtered);
  }

  return args;
}
