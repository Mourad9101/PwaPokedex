export type NotificationPermissionState = NotificationPermission | 'unsupported'

export async function ensureNotificationPermission(): Promise<NotificationPermissionState> {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const permission = await Notification.requestPermission()
  return permission
}

export function notify(title: string, options?: NotificationOptions): boolean {
  if (!('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false
  // eslint-disable-next-line no-new
  new Notification(title, options)
  return true
}
