/**
 * Kiosk Offline-First Synchronization Queue
 * Persists trackside check-ins during Wi-Fi drops and flushes automatically on reconnect.
 */

export interface QueuedCheckIn {
  id: string;
  sessionId: string;
  athleteId?: string;
  pin?: string;
  athleteName?: string;
  timestamp: number;
  status: "pending" | "syncing" | "failed";
  retryCount: number;
  error?: string;
}

const QUEUE_STORAGE_KEY = "peakform_kiosk_offline_queue";

type QueueListener = (queue: QueuedCheckIn[]) => void;
const listeners = new Set<QueueListener>();

function loadQueue(): QueuedCheckIn[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedCheckIn[]) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    notifyListeners(queue);
  } catch (err) {
    console.error("Failed to persist offline check-in queue", err);
  }
}

function notifyListeners(queue?: QueuedCheckIn[]) {
  const current = queue ?? loadQueue();
  for (const listener of listeners) {
    try {
      listener(current);
    } catch (e) {
      console.error("Error in queue listener", e);
    }
  }
}

export function getOfflineQueue(): QueuedCheckIn[] {
  return loadQueue();
}

export function enqueueOfflineCheckIn(
  data: Omit<QueuedCheckIn, "id" | "timestamp" | "status" | "retryCount">,
): QueuedCheckIn {
  const queue = loadQueue();
  const newItem: QueuedCheckIn = {
    ...data,
    id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    status: "pending",
    retryCount: 0,
  };
  queue.push(newItem);
  saveQueue(queue);
  return newItem;
}

export function removeQueuedCheckIn(id: string): void {
  const queue = loadQueue().filter((item) => item.id !== id);
  saveQueue(queue);
}

export function clearOfflineQueue(): void {
  saveQueue([]);
}

export function subscribeOfflineQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  listener(loadQueue());
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Flush pending items to Convex
 */
export async function flushOfflineQueue(
  checkInFn: (args: {
    sessionId: string;
    athleteId?: string;
    pin?: string;
  }) => Promise<unknown>,
): Promise<{ synced: number; failed: number }> {
  const queue = loadQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: QueuedCheckIn[] = [];

  for (const item of queue) {
    try {
      item.status = "syncing";
      saveQueue([...remaining, item]);

      await checkInFn({
        sessionId: item.sessionId,
        athleteId: item.athleteId,
        pin: item.pin,
      });

      synced++;
    } catch (err: unknown) {
      failed++;
      item.status = "failed";
      item.retryCount = (item.retryCount || 0) + 1;
      item.error = err instanceof Error ? err.message : String(err);
      remaining.push(item);
    }
  }

  saveQueue(remaining);
  return { synced, failed };
}
