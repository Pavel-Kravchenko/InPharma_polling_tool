type Listener = (data: unknown) => void;

class EventBus {
  private listeners: Map<string, Set<Listener>> = new Map();

  subscribe(channel: string, listener: Listener): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(listener);
    return () => this.listeners.get(channel)?.delete(listener);
  }

  emit(channel: string, data: unknown): void {
    this.listeners.get(channel)?.forEach((fn) => fn(data));
  }
}

const globalForEventBus = globalThis as unknown as {
  eventBus: EventBus | undefined;
};

export const eventBus = globalForEventBus.eventBus ?? new EventBus();

if (process.env.NODE_ENV !== "production") globalForEventBus.eventBus = eventBus;
