import { ON_TABLE_ADDON_PRICE_IDR, ON_THE_TABLE_ADDON_PRICE_IDR, ON_THE_TABLE_PRICE_IDR } from '@/lib/plan'
import { XENDIT_PLATFORM_FEE_PERCENT, calculateXenditFee } from '@/lib/xendit'
import * as plan from '@/lib/plan'
import * as xendit from '@/lib/xendit'

export const ADD_ON_PRICE_IDR = ON_TABLE_ADDON_PRICE_IDR
export const ADDON_PRICE_IDR = ON_TABLE_ADDON_PRICE_IDR
export const PRICE_IDR = ON_TABLE_ADDON_PRICE_IDR
export const FEE_PERCENT = XENDIT_PLATFORM_FEE_PERCENT

export const ON_THE_TABLE_ADDON_PRICE_IDR = ON_TABLE_ADDON_PRICE_IDR
export const ON_TABLE_ADDON_PRICE_IDR_EXPORT = ON_TABLE_ADDON_PRICE_IDR
export const ON_THE_TABLE_FEE_PERCENT = XENDIT_PLATFORM_FEE_PERCENT

export function onTableFeePercent() {
  return XENDIT_PLATFORM_FEE_PERCENT
}

export function calculateOnTableFee(amount, percent = XENDIT_PLATFORM_FEE_PERCENT) {
  return calculateXenditFee(amount, percent)
}

export function parseTableNumber(value) {
  const n = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isFinite(n) || n < 1) return null
  return n
}

export function tableScanPath(storeId, tableNumber) {
  return `/t/${storeId}/${tableNumber}`
}

export function isOnTableAddonActive(store) {
  return Boolean(store?.on_table_enabled || store?.on_table === true)
}
