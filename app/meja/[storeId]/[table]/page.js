import { redirect } from 'next/navigation'
export default async function Page({ params }) {
  const { storeId, table } = await params
  redirect(`/t/${storeId}/${table}`)
}
