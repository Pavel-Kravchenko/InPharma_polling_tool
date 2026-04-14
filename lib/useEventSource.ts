"use client";
import { useEffect, useRef, useCallback } from "react";

export function useEventSource(url: string | null, onMessage: (data: unknown) => void) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const stableOnMessage = useCallback((data: unknown) => {
    onMessageRef.current(data);
  }, []);

  useEffect(() => {
    if (!url) return;

    let es: EventSource;
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource(url);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          stableOnMessage(data);
        } catch {
          // Non-JSON messages (e.g. keepalive comments) are not delivered here
        }
      };

      es.onerror = () => {
        es.close();
        retryTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      es?.close();
      clearTimeout(retryTimeout);
    };
  }, [url, stableOnMessage]);
}
