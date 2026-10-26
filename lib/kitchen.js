export const KITCHEN_STATUSES = new Set(['pending', 'cooking', 'done', 'served'])
export const KDS_STATUSES = KITCHEN_STATUSES

export function normalizeKitchenStatus(value) {
  const status = String(value || '').trim().toLowerCase()
  return KITCHEN_STATUSES.has(status) ? status : null
}

export function normalizeKdsStatus(value) {
  return normalizeKitchenStatus(value)
}

export function isNewOrder(order) {
  return Boolean(order && (order.status === 'pending' || order.kitchen_status === 'new'))
}

export function kitchenNotificationTitle(order) {
  return `Pesanan baru${order?.table_number ? ` - Meja ${order.table_number}` : ''}`
}
