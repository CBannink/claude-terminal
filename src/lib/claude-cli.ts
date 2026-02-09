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

  if (options.resumeId) {
    args.push("--resume", options.resumeId);
  }

  if (options.model) {
    args.push("--model", options.model);
  }

  if (options.extraArgs) {
    args.push(...options.extraArgs);
  }

  return args;
}
