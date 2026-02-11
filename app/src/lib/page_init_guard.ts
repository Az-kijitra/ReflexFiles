/**
 * @param {string[]} names
 * @param {(name: string) => void} onError
 */
export function createInitGuard(names, onError) {
  const pending = new Set(names);
  return {
    markReady(name) {
      pending.delete(name);
    },
    checkReady() {
      if (pending.size === 0) return true;
      const missing = Array.from(pending).join(", ");
      onError(`initPage incomplete: ${missing}`);
      return false;
    },
  };
}
