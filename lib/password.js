import 'server-only'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

// Kata sandi kasir di-hash dengan scrypt bawaan Node. Tidak ada dependensi
// tambahan dan tidak ada kata sandi yang pernah disimpan sebagai teks biasa.
//
// Format yang disimpan: scrypt$N$r$p$salt$hash (semua hex/angka). Parameter
// ikut disimpan supaya hash lama tetap bisa diverifikasi kalau parameter
// dinaikkan di kemudian hari.
const KEY_LENGTH = 64
const DEFAULT_N = 16384
const DEFAULT_R = 8
const DEFAULT_P = 1

export const MIN_PASSWORD_LENGTH = 6
export const MAX_PASSWORD_LENGTH = 72

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error('Kata sandi terlalu pendek')
  }
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, KEY_LENGTH, {
    N: DEFAULT_N,
    r: DEFAULT_R,
    p: DEFAULT_P,
  }).toString('hex')
  return `scrypt$${DEFAULT_N}$${DEFAULT_R}$${DEFAULT_P}$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  if (typeof password !== 'string' || !password) return false
  if (typeof stored !== 'string') return false

  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const n = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false
  if (n < 1024 || n > 1 << 20 || r < 1 || r > 32 || p < 1 || p > 16) return false

  let expected
  try {
    expected = Buffer.from(parts[5], 'hex')
  } catch {
    return false
  }
  if (expected.length !== KEY_LENGTH) return false

  let actual
  try {
    actual = scryptSync(password, parts[4], KEY_LENGTH, { N: n, r, p })
  } catch {
    return false
  }

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
