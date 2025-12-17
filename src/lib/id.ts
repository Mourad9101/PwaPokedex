export function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random())
}

