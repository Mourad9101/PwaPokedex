export function formatDexNumber(id: number): string {
  if (!Number.isFinite(id)) return '#???'
  return `#${String(Math.trunc(id)).padStart(3, '0')}`
}

