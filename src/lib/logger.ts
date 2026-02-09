import { invoke } from "@tauri-apps/api/core";

type LogLevel = "info" | "warn" | "error";

const MAX_QUEUE_SIZE = 500;
const MAX_RETRIES = 3;

interface QueueEntry {
  text: string;
  retries: number;
}

const queue: QueueEntry[] = [];
let flushing = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

function formatEntry(level: LogLevel, message: string): string {
  const now = new Date().toISOString();
  return `[${now}] [${level.toUpperCase()}] ${message}`;
}

function isTauriReady(): boolean {
  return !!window.__TAURI_INTERNALS__;
}

async function flush() {
  if (flushing || queue.length === 0 || !isTauriReady()) return;
  flushing = true;

  try {
    while (queue.length > 0) {
      const entry = queue[0];
      try {
        await invoke("append_log", { message: entry.text });
        queue.shift();
      } catch {
        entry.retries++;
        if (entry.retries >= MAX_RETRIES) {
          queue.shift();
        }
        break;
      }
    }
  } finally {
    flushing = false;
    // Stop interval when queue is drained
    if (queue.length === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
}

function ensureInterval() {
  if (intervalId === null) {
    intervalId = setInterval(() => { flush().catch(() => {}); }, 1000);
  }
}

export function log(level: LogLevel, message: string) {
  const entry: QueueEntry = { text: formatEntry(level, message), retries: 0 };

  // Cap queue size — drop oldest entries when full
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift();
  }

  queue.push(entry);

  // Start periodic flush lazily (only when entries exist)
  ensureInterval();

  // Try immediate flush if Tauri is ready
  flush().catch(() => {});
}
