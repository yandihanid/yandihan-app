const DEVICE_KEY = 'yandihan_device_id'

export function getCashierDeviceId() {
  let id = null
  try {
    id = localStorage.getItem(DEVICE_KEY)
  } catch {
    return null
  }

  if (!id || id.length < 16) {
    if (typeof crypto === 'undefined' || !crypto.randomUUID) return null
    id = crypto.randomUUID()
    try {
      localStorage.setItem(DEVICE_KEY, id)
    } catch {
      return null
    }
  }
  return id
}

export function cashierDeviceHeaders() {
  const deviceId = getCashierDeviceId()
  return deviceId ? { 'x-device-id': deviceId } : {}
}
