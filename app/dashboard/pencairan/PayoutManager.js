'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import { formatRupiah } from '@/lib/format'
import {
  checkStorePayoutAction,
  retryStorePayoutAction,
  runStorePayoutAction,
  updateStorePayoutFeeAction,
} from './actions'

const STATUS_LABEL = {
  pending: 'Menunggu',
  submitted: 'Diproses bank',
  paid: 'Sudah masuk rekening',
  failed: 'Gagal',
}

function useAction() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(async (_prev, formData) => {
    const result = await runStorePayoutAction(formData)
    if (result?.success) router.refresh()
    return result
  }, null)
  return { state, formAction, pending }
}

export default function PayoutManager({ stores, balances, payouts }) {
  const router = useRouter()
  const { state, formAction, pending } = useAction()
  const [notice, setNotice] = useState(null)
  const [problem, setProblem] = useState(null)

  const balanceByStore = new Map(balances.map((entry) => [entry.storeId, entry.summary]))

  const handleRetry = async (formData) => {
    setNotice(null)
    setProblem(null)
    const result = await retryStorePayoutAction(formData)
    if (result?.error) setProblem(result.error)
    else setNotice(result?.message || 'Pencairan dikirim ulang.')
    router.refresh()
  }

  const handleCheck = async (formData) => {
    setNotice(null)
    setProblem(null)
    const result = await checkStorePayoutAction(formData)
    if (result?.error) setProblem(result.error)
    else setNotice(result?.message || 'Status diperbarui.')
    router.refresh()
  }

  const handleFee = async (formData) => {
    setNotice(null)
    setProblem(null)
    const result = await updateStorePayoutFeeAction(formData)
    if (result?.error) setProblem(result.error)
    else setNotice('Potongan platform disimpan.')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.success && <Alert variant="success">{state.message}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}
      {problem && <Alert variant="error">{problem}</Alert>}

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <h3 style={{ fontSize: '1.125rem', padding: '1.25rem', margin: 0 }}>Saldo per toko</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Toko</th>
                <th>Rekening tujuan</th>
                <th>Omzet</th>
                <th>Potongan</th>
                <th>Saldo</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {stores.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                    Belum ada toko.
                  </td>
                </tr>
              )}
              {stores.map((store) => {
                const summary = balanceByStore.get(store.id)
                const ready = Boolean(store.payout_enabled && store.payout_bank_code)
                const canPay = summary?.eligible && ready

                return (
                  <tr key={store.id}>
                    <td>
                      <strong>{store.name}</strong>
                      {!store.payout_enabled && (
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--warning-dark)' }}>
                          Toko belum mengaktifkan pencairan
                        </p>
                      )}
                      {store.payout_enabled && !store.payout_bank_code && (
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--warning-dark)' }}>
                          Rekening belum lengkap
                        </p>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {store.payout_bank_code ? (
                        <>
                          {store.payout_bank_code} · {store.payout_account_number}
                          <br />
                          <span style={{ color: 'var(--text-muted)' }}>
                            {store.payout_account_name}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Belum diisi</span>
                      )}
                    </td>
                    <td>{formatRupiah(summary?.gross ?? 0)}</td>
                    <td>
                      <form action={handleFee} style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <input
                          className="input"
                          type="number"
                          name="feePercent"
                          min="0"
                          max="100"
                          step="0.1"
                          defaultValue={store.payout_fee_percent ?? ''}
                          placeholder="0"
                          style={{ width: '5.5rem', padding: '0.3rem 0.4rem', fontSize: '0.8125rem' }}
                          aria-label={`Potongan platform untuk ${store.name}`}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>%</span>
                      </form>
                    </td>
                    <td>
                      <strong>{formatRupiah(summary?.amount ?? 0)}</strong>
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {summary?.orderCount ?? 0} pesanan · min {formatRupiah(summary?.minimum ?? 0)}
                      </p>
                    </td>
                    <td>
                      <form action={formAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <Button type="submit" size="sm" disabled={!canPay || pending}>
                          Cairkan
                        </Button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <h3 style={{ fontSize: '1.125rem', padding: '1.25rem', margin: 0 }}>Riwayat pencairan</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Toko</th>
                <th>Nominal</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                    Belum ada pencairan.
                  </td>
                </tr>
              )}
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td style={{ fontSize: '0.8rem' }}>
                    {new Date(payout.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                  </td>
                  <td>{payout.storeName}</td>
                  <td>
                    <strong>{formatRupiah(payout.amount)}</strong>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      dari {formatRupiah(payout.gross_amount)} · potongan {formatRupiah(payout.fee_amount)}
                    </p>
                  </td>
                  <td>
                    <span>{STATUS_LABEL[payout.status] || payout.status}</span>
                    {payout.failure_reason && payout.status === 'failed' && (
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--danger-dark)' }}>
                        {payout.failure_reason}
                      </p>
                    )}
                  </td>
                  <td>
                    {payout.status === 'failed' && (
                      <form action={handleRetry} style={{ display: 'inline' }}>
                        <input type="hidden" name="payoutId" value={payout.id} />
                        <Button type="submit" size="sm" variant="secondary">
                          Kirim ulang
                        </Button>
                      </form>
                    )}
                    {payout.status === 'submitted' && (
                      <form action={handleCheck} style={{ display: 'inline' }}>
                        <input type="hidden" name="payoutId" value={payout.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          Periksa status
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
