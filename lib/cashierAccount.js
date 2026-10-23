// Aturan akun kasir dipakai bersama oleh form pengaturan dan route login.
// File ini tidak menyimpan rahasia, jadi aman diimpor dari komponen client.
export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 32
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_MAX_LENGTH = 72

export function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase()
}

export function validateUsername(value) {
  const username = normalizeUsername(value)
  if (!username) return 'Username wajib diisi'
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Username minimal ${USERNAME_MIN_LENGTH} karakter`
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Username maksimal ${USERNAME_MAX_LENGTH} karakter`
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username hanya boleh huruf kecil, angka, titik, garis bawah, atau tanda hubung'
  }
  return null
}

export function validatePassword(value, { required = true } = {}) {
  const password = String(value || '')
  if (!password) return required ? 'Kata sandi wajib diisi' : null
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter`
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Kata sandi maksimal ${PASSWORD_MAX_LENGTH} karakter`
  }
  return null
}
