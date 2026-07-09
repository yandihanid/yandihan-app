// app/api/pricing/route.js
export async function GET() {
  const pricing = {
    pro: {
      monthlyPrice: 78000,
      monthlyPriceFormatted: 'Rp78.000',
      currency: 'IDR',
    },
  };

  return new Response(JSON.stringify(pricing), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
}
