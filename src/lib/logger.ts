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

function formatEntry(level: LogLevel, message: string): string {
  const now = new Date().toISOString();
  return `[${now}] [${level.toUpperCase()}] ${message}`;
}

async function flush() {
  if (flushing || queue.length === 0) return;
  flushing = true;

  try {
    while (queue.length > 0) {
      const entry = queue[0];
      try {
        await invoke("append_log", { message: entry.text });
        queue.shift();
      } catch {
        // Tauri not ready yet or command failed — retry or drop
        entry.retries++;
        if (entry.retries >= MAX_RETRIES) {
          queue.shift(); // Drop after max retries
        }
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

export function log(level: LogLevel, message: string) {
  const entry: QueueEntry = { text: formatEntry(level, message), retries: 0 };

  // Cap queue size — drop oldest entries when full
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift();
  }

  queue.push(entry);
  flush().catch(() => {});
}

// Flush any remaining entries periodically (catches queued-before-ready entries)
setInterval(() => { flush().catch(() => {}); }, 1000);
