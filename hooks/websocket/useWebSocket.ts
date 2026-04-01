import { useState, useEffect, useCallback } from 'react';

export function useWebSocket(url?: string) {
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  const send = useCallback((message: unknown) => {
    // TODO: Implementar WebSocket send
  }, []);

  useEffect(() => {
    // TODO: Implementar WebSocket connection
  }, [url]);

  return { connected, data, error, send, lastMessage };
}
