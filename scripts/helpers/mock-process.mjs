export function waitForMockMessage(child, type, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      child.off('message', onMessage); child.off('error', onError); child.off('exit', onExit);
    };
    const onError = () => { cleanup(); reject(Error('Mock process failed.')); };
    const onExit = () => { cleanup(); reject(Error('Mock process exited before the expected message.')); };
    const onMessage = event => {
      if (event?.type === 'error') { onError(); return; }
      if (event?.type !== type) return;
      cleanup(); resolve(event);
    };
    // Referenced until settlement: an early child exit must not strand top-level await.
    const timer = setTimeout(() => { cleanup(); reject(Error('Mock process message deadline exceeded.')); }, timeoutMs);
    child.on('message', onMessage); child.once('error', onError); child.once('exit', onExit);
  });
}
