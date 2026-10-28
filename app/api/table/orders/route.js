// Alias lama untuk /api/on-the-table/orders.
//
// Versi sebelumnya membuat transaksi (dan mengurangi stok) SEBELUM pelanggan
// membayar. Sekarang seluruh jalur meja lewat satu handler yang mencatat
// pesanan dulu, lalu baru membuat transaksi setelah pembayaran diterima.
// File ini dipertahankan supaya pemanggil lama tidak menerima 404.
export { POST } from '@/app/api/on-the-table/orders/route'
