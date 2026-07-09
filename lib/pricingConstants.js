// lib/pricingConstants.js

export const PRO_MONTHLY_PRICE = 58000; // harga dalam rupiah

export const PRO_MONTHLY_PRICE_FORMATTED = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(PRO_MONTHLY_PRICE); // "Rp58.000"

export const PRO_MONTHLY_PRICE_DISPLAY = "Rp58.000";
