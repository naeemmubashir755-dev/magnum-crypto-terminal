(() => {
  'use strict';

  const subscribers = new Set();
  let socket;
  let latestMarketUpdate = null;
  let clientLoadPromise;
  let reconnectTimer;
  let connectionStatus = 'connecting';

  const getSocketOrigin = () => {
    if (window.MAGNUM_SOCKET_URL) return window.MAGNUM_SOCKET_URL.replace(/\/$/, '');

    const apiUrl = window.MAGNUM_API_URL || '/api';
    return new URL(apiUrl, window.location.origin).origin;
  };

  const notifyStatus = (status, message) => {
    connectionStatus = status;
    window.dispatchEvent(new CustomEvent('market-socket-status', {
      detail: { status, message },
    }));
  };

  const notifyMarketSubscribers = (update) => {
    subscribers.forEach((subscriber) => {
      try {
        subscriber(update);
      } catch (error) {
        console.error('A live market update subscriber failed:', error);
      }
    });
  };

  const loadSocketClient = () => {
    if (window.io) return Promise.resolve();
    if (clientLoadPromise) return clientLoadPromise;

    const script = document.createElement('script');
    script.src = `${getSocketOrigin()}/socket.io/socket.io.js`;
    script.async = true;

    clientLoadPromise = new Promise((resolve, reject) => {
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error('The live update client could not be loaded.')), { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      clientLoadPromise = null;
      script.remove();
      throw error;
    });

    return clientLoadPromise;
  };

  const scheduleClientRetry = () => {
    if (reconnectTimer) return;

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, 5_000);
  };

  const connect = async () => {
    if (socket?.connected || socket?.active) return;

    try {
      await loadSocketClient();
      socket = window.io(getSocketOrigin(), {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 10_000,
        timeout: 10_000,
      });

      socket.on('connect', () => notifyStatus('connected', 'Live market updates connected.'));
      socket.on('disconnect', () => notifyStatus('disconnected', 'Live updates disconnected. Reconnecting…'));
      socket.on('connect_error', () => notifyStatus('error', 'Live updates are unavailable. Retrying automatically…'));
      socket.on('market:error', (error) => notifyStatus('error', error?.message || 'Live market updates are temporarily unavailable.'));
      socket.on('market:update', (update) => {
        if (!Array.isArray(update?.markets)) return;
        latestMarketUpdate = update;
        notifyMarketSubscribers(update);
      });
    } catch (error) {
      console.warn('Live market updates could not be initialized:', error.message);
      notifyStatus('error', 'Live updates are unavailable. Retrying automatically…');
      scheduleClientRetry();
    }
  };

  window.marketSocket = {
    subscribe(callback) {
      if (typeof callback !== 'function') return () => {};

      subscribers.add(callback);
      if (latestMarketUpdate) window.setTimeout(() => callback(latestMarketUpdate), 0);
      return () => subscribers.delete(callback);
    },
    getStatus: () => connectionStatus,
    getLatestMarketUpdate: () => latestMarketUpdate,
  };

  connect();
})();
