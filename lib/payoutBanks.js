/**
 * Bank tujuan pencairan dan validasi rekeningnya.
 *
 * Sengaja TANPA `server-only`: daftar bank dipakai juga oleh komponen client
 * (formulir rekening toko) supaya pilihan bank di layar dan yang diterima
 * server tidak pernah berbeda.
 *
 * `code` adalah kode kanal Xendit. Xendit memakai dua nama untuk satu bank:
 * `bank_code` (mis. "BCA") dan `channel_code` dengan awalan negara
 * (mis. "ID_BCA").
 */

export const PAYOUT_BANK_CODES = [
  { code: 'BCA', label: 'BCA' },
  { code: 'MANDIRI', label: 'Mandiri' },
  { code: 'BRI', label: 'BRI' },
  { code: 'BNI', label: 'BNI' },
  { code: 'BSI', label: 'BSI (Syariah)' },
  { code: 'PERMATA', label: 'Permata' },
  { code: 'DANAMON', label: 'Danamon' },
  { code: 'CIMB', label: 'CIMB Niaga' },
  { code: 'SINARMAS', label: 'Sinarmas' },
  { code: 'BTPN', label: 'BTPN' },
]

const BANK_CODE_SET = new Set(PAYOUT_BANK_CODES.map((bank) => bank.code))

/** Batas aman untuk nama pemilik rekening dan nomor rekening. */
export const MAX_ACCOUNT_NAME_LENGTH = 80
export const MAX_ACCOUNT_NUMBER_LENGTH = 30

export function isSupportedBankCode(code) {
  return BANK_CODE_SET.has(String(code || '').trim().toUpperCase())
}

/**
 * Validasi rekening pencairan yang diisi pemilik toko.
 *
 * @returns {{ bankCode: string, accountNumber: string, accountName: string, error: string | null }}
 */
export function parseBankDetails({ bankCode, accountNumber, accountName }) {
  const code = String(bankCode || '').trim().toUpperCase()
  const number = String(accountNumber || '').replace(/\s+/g, '')
  const name = String(accountName || '').trim()

  if (!code) return { bankCode: '', accountNumber: '', accountName: '', error: 'Pilih bank tujuan pencairan' }
  if (!isSupportedBankCode(code)) {
    return { bankCode: '', accountNumber: '', accountName: '', error: 'Bank tujuan tidak didukung' }
  }
  if (!/^\d+$/.test(number)) {
    return { bankCode: '', accountNumber: '', accountName: '', error: 'Nomor rekening hanya boleh angka' }
  }
  if (number.length < 6 || number.length > MAX_ACCOUNT_NUMBER_LENGTH) {
    return {
      bankCode: '',
      accountNumber: '',
      accountName: '',
      error: `Nomor rekening harus 6-${MAX_ACCOUNT_NUMBER_LENGTH} angka`,
    }
  }
  if (!name) {
    return { bankCode: '', accountNumber: '', accountName: '', error: 'Nama pemilik rekening wajib diisi' }
  }
  if (name.length > MAX_ACCOUNT_NAME_LENGTH) {
    return {
      bankCode: '',
      accountNumber: '',
      accountName: '',
      error: `Nama pemilik rekening terlalu panjang (maks ${MAX_ACCOUNT_NAME_LENGTH} karakter)`,
    }
  }

  return { bankCode: code, accountNumber: number, accountName: name, error: null }
}
