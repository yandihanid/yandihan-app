export const QUEUE_STATUSES = new Set(['pending', 'done'])

export function normalizeQueueStatus(value) {
  const status = String(value || '').trim().toLowerCase()
  return QUEUE_STATUSES.has(status) ? status : null
}
