// app/api/pricing/route.js
import { PRO_MONTHLY_PRICE, PRO_MONTHLY_PRICE_FORMATTED } from '@/lib/pricingConstants';

export async function GET() {
  const pricing = {
    pro: {
      monthlyPrice: PRO_MONTHLY_PRICE,
      monthlyPriceFormatted: PRO_MONTHLY_PRICE_FORMATTED,
      currency: 'IDR',
    },
  };

  return new Response(JSON.stringify(pricing), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
}
