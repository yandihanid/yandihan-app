-- ============================================================
-- Migration: Tambah fitur Loyalty / Pelanggan
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom loyalty ke tabel stores
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS pelanggan_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visit_threshold   INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS discount_percent  INTEGER DEFAULT 10;

-- 2. Buat tabel customers
CREATE TABLE IF NOT EXISTS customers (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  visit_count INTEGER DEFAULT 1,
  total_spent NUMERIC(14,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (store_id, phone)
);

-- 3. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone    ON customers(phone);

-- 4. Tambah kolom customer & diskon ke tabel transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS customer_name     TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone    TEXT,
  ADD COLUMN IF NOT EXISTS original_amount   INTEGER,
  ADD COLUMN IF NOT EXISTS discount_percent  INTEGER DEFAULT 0;

-- 5. RLS untuk tabel customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Owner toko bisa CRUD semua customer tokonya
CREATE POLICY "Owner manage customers" ON customers
  FOR ALL
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

-- Service role (kasir via token) bisa insert & update customers
-- (Kasir pakai service key, jadi bypass RLS — tidak perlu policy tambahan)

-- ============================================================
-- Selesai. Verifikasi:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'stores' AND column_name LIKE '%pelanggan%';
-- ============================================================